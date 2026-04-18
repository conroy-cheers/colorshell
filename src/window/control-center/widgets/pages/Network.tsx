import { Gtk } from "ags/gtk4";
import { Page, PageButton } from "../Page";
import { Windows } from "../../../../window";
import { tr } from "../../../../i18n/intl";
import { execApp } from "../../../../modules/apps";
import { Notifications } from "../../../../modules/notifications";
import { AskPopup, AskPopupProps } from "../../../../widget/AskPopup";
import { encoder, variableToBoolean } from "../../../../modules/utils";
import { createBinding, createRoot, For, With } from "ags";

import GLib from "gi://GLib?version=2.0";
import NM from "gi://NM";
import AstalNetwork from "gi://AstalNetwork";


const network = AstalNetwork.get_default();
const wifi = createBinding(network, "wifi");
const primary = createBinding(network, "primary");
const devices = createBinding(network.client, "devices").as(devs =>
    (devs ?? []).filter(dev => dev != null && dev.interface !== "lo" && dev.real)
);

export const PageNetwork = createRoot((dispose) => <Page
    id={"network"}
    title={tr("control_center.pages.network.title")}
    headerButtons={createComputed([primary, wifi], (primary, wifi) =>
        primary === AstalNetwork.Primary.WIFI && wifi ? [{
            icon: "arrow-circular-top-right-symbolic",
            tooltipText: "Re-scan networks",
            actionClicked: () => wifi.scan()
        }] : []
    )}
    bottomButtons={[{
        title: tr("control_center.pages.more_settings"),
        actionClicked: () => {
            Windows.getDefault().close("control-center");
            execApp("nm-connection-editor", "[animationstyle gnomed]");
        }
    }]}
    actionClosed={() => {
        Promise.resolve(dispose()).catch(console.error);
    }}
    content={() => [
        <Gtk.Box class={"devices"} hexpand orientation={Gtk.Orientation.VERTICAL}
          visible={devices.as(devs => devs.length > 0)}
          spacing={4}>

            <Gtk.Label label={tr("devices")} xalign={0} class={"sub-header"} />
            <For each={devices}>

                {(device: NM.Device) => <PageButton title={createBinding(device, "interface").as(iface =>
                    iface ?? tr("control_center.pages.network.interface"))} class={"device"}
                  icon={createBinding(device, "deviceType").as(type => type === NM.DeviceType.WIFI ?
                    "network-wireless-symbolic" : "network-wired-symbolic")} extraButtons={[

                      <Gtk.Button iconName={"view-more-symbolic"} onClicked={() => {
                          Windows.getDefault().close("control-center");
                          execApp(
                              `nm-connection-editor --edit ${device.activeConnection?.connection.get_uuid()}`,
                              "[animationstyle gnomed; float]"
                          );
                      }} />
                  ]}
                />}
            </For>
        </Gtk.Box>,
        <With value={createComputed([primary, wifi], (primary, wifi) =>
            primary === AstalNetwork.Primary.WIFI ? wifi : null
        )}>
            {(wifiDevice: AstalNetwork.Wifi | null) => wifiDevice && <Gtk.Box
              class={"wireless-aps"} hexpand={true} orientation={Gtk.Orientation.VERTICAL}>

                <Gtk.Label class={"sub-header"} label={"Wi-Fi"} />
                <For each={createBinding(wifiDevice, "accessPoints").as(aps =>
                    (aps ?? []).filter((ap): ap is AstalNetwork.AccessPoint => ap != null)
                )}>
                    {(ap: AstalNetwork.AccessPoint) => <PageButton class={
                        createBinding(wifiDevice, "activeAccessPoint").as(activeAP =>
                            activeAP?.ssid === ap.ssid ? "active" : "")
                      } title={createBinding(ap, "ssid").as(ssid => ssid ?? "No SSID")}
                      icon={createBinding(ap, "iconName").as(icon => icon ?? "network-wireless-symbolic")}
                      endWidget={<Gtk.Image iconName={
                          createBinding(ap, "flags").as(flags => 
                            // @ts-ignore
                            flags & NM["80211ApFlags"].PRIVACY ?
                                "channel-secure-symbolic"
                            : "channel-insecure-symbolic")}
                          css={"font-size: 18px;"}
                      />} extraButtons={[
                          <Gtk.Button iconName={"window-close-symbolic"} visible={
                              createBinding(wifiDevice, "activeAccessPoint").as(activeAp =>
                                  activeAp?.ssid === ap.ssid)
                          } css={"font-size: 18px;"} onClicked={() => {
                                const active = wifiDevice.activeAccessPoint;

                                if(active?.ssid === ap.ssid) {
                                    wifiDevice.deactivate_connection((_, res) => {
                                        try { 
                                            wifiDevice.deactivate_connection_finish(res);
                                        } catch(e: any) {
                                            e = e as Error;

                                            console.error(
                                                `Network: couldn't deactivate connection with access point(SSID: ${
                                                    ap.ssid}. Stderr: \n${e.message}\n${e.stack}`
                                            );
                                        }
                                    })
                                }
                            }}/>
                          ]} actionClicked={() => {
                          const ssid = ap.ssid ?? "No SSID";
                          const uuid = NM.utils_uuid_generate();
                          const ssidBytes = GLib.Bytes.new(encoder.encode(ssid));

                          const connection = NM.SimpleConnection.new();
                          const connSetting = NM.SettingConnection.new();
                          const wifiSetting = NM.SettingWireless.new();
                          const wifiSecuritySetting = NM.SettingWirelessSecurity.new();
                          const setting8021x = NM.Setting8021x.new();

                          // @ts-ignore yep, type-gen issues again
                          if(ap.rsnFlags !& NM["80211ApSecurityFlags"].KEY_MGMT_802_1X &&
                          // @ts-ignore
                             ap.wpaFlags !& NM["80211ApSecurityFlags"].KEY_MGMT_802_1X) {
                              return;
                          }

                          connSetting.uuid = uuid;
                          connection.add_setting(connSetting);

                          connection.add_setting(wifiSetting);
                          wifiSetting.ssid = ssidBytes;
                          
                          wifiSecuritySetting.keyMgmt = "wpa-eap";
                          connection.add_setting(wifiSecuritySetting);

                          setting8021x.add_eap_method("ttls");
                          setting8021x.phase2Auth = "mschapv2";
                          connection.add_setting(setting8021x);
                      }}
                    />}
                </For>
            </Gtk.Box>}
        </With>
    ]}
/> as Page);

function activateWirelessConnection(connection: NM.RemoteConnection, ssid: string): void {
    AstalNetwork.get_default().get_client().activate_connection_async(
        connection, AstalNetwork.get_default().wifi.get_device(), null, null, (_, asyncRes) => {
            const activeConnection = AstalNetwork.get_default().get_client().activate_connection_finish(asyncRes);
            if(!activeConnection) {
                Notifications.getDefault().sendNotification({
                    appName: "network",
                    summary: "Couldn't activate wireless connection",
                    body: `An error occurred while activating the wireless connection "${ssid}"`
                });
                return;
            }
        }
    );
}

function notifyConnectionError(ssid: string): void {
    Notifications.getDefault().sendNotification({
        appName: "network",
        summary: "Coudn't connect Wi-Fi",
        body: `An error occurred while trying to connect to the "${ssid}" access point. \nMaybe the password is invalid?`
    });
}
function saveToDisk(remoteConnection: NM.RemoteConnection, ssid: string): void {
    AskPopup({
        text: `Save password for connection "${ssid}"?`,
        acceptText: "Yes",
        onAccept: () => remoteConnection.commit_changes_async(true, null, (_, asyncRes) => 
            !remoteConnection.commit_changes_finish(asyncRes) && Notifications.getDefault().sendNotification({
                appName: "network",
                summary: "Couldn't save Wi-Fi password",
                body: `An error occurred while trying to write the password for "${ssid}" to disk`
        }))
    } as AskPopupProps);
}
