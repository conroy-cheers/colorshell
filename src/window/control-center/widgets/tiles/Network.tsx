import { Tile } from "./Tile";
import { execAsync } from "ags/process";
import { PageNetwork } from "../pages/Network";
import { tr } from "../../../../i18n/intl";
import { TilesPages } from "../tiles";
import { createBinding, createComputed } from "ags";

import AstalNetwork from "gi://AstalNetwork";
import { Notifications } from "../../../../modules/notifications";


const { WIFI, WIRED } = AstalNetwork.Primary,
    { CONNECTED, CONNECTING, DISCONNECTED } = AstalNetwork.Internet;
const network = AstalNetwork.get_default();
const primary = createBinding(network, "primary");
const wifi = createBinding(network, "wifi");
const wired = createBinding(network, "wired");

export const TileNetwork = () => 
    <Tile hasArrow title={createComputed([primary, wifi], (primary, wifi) => {
        switch(primary) {
            case WIFI:
                if(wifi?.internet === CONNECTED)
                    return wifi.ssid ?? tr("control_center.tiles.network.wireless");

                return tr("control_center.tiles.network.wireless");

            case WIRED:
                return tr("control_center.tiles.network.wired");
        }

        return tr("control_center.tiles.network.network");
      })}
      onClicked={() => TilesPages?.toggle(PageNetwork)}
      icon={createComputed([primary, wifi, wired], (primary, wifi, wired) => {
          switch(primary) {
              case WIFI:
                  return wifi?.iconName ?? "network-wireless-symbolic";

              case WIRED:
                  return wired?.iconName ?? "network-wired-symbolic";
          }

          return "network-wired-no-route-symbolic";
      })}
      state={createComputed([primary, wifi, wired], (primary, wifi, wired) => {
          switch(primary) {
              case WIFI:
                  return wifi?.enabled ?? false;

              case WIRED:
                  return wired?.internet === CONNECTED || wired?.internet === CONNECTING;
          }

          return false;
      })}
      description={createComputed([primary, wifi, wired], (primary, wifi, wired) => {
          switch(primary) {
              case WIFI:
                  return internetToTranslatedString(wifi?.internet ?? DISCONNECTED);

              case WIRED:
                  return internetToTranslatedString(wired?.internet ?? DISCONNECTED);
          }

          return tr("disconnected");        
      })}
      onToggled={(self, state) => {
          const wifi = network.wifi,
              wired = network.wired;

          switch(network.primary) {
              case WIFI:
                  wifi?.set_enabled(state);
                  return;

              case WIRED:
                  setNetworking(state);
                  return;
          }

          if(wired && wired.internet === DISCONNECTED) {
              setNetworking(true);
              return;
          } else if(wifi && !wifi.enabled) {
              wifi.set_enabled(true);
              return;
          }

          // disable if no device available
          self.state = false;
      }}
    />;


function internetToTranslatedString(internet: AstalNetwork.Internet): string {
    switch(internet) {
        case AstalNetwork.Internet.CONNECTED: 
            return tr("connected");
        case AstalNetwork.Internet.CONNECTING:
            return tr("connecting") + "...";
    }

    return tr("disconnected");
}

function setNetworking(state: boolean): void {
    (!state ? 
        execAsync("nmcli n off")
      : execAsync("nmcli n on")
    ).catch(e => {
        Notifications.getDefault().sendNotification({
            appName: "network",
            summary: "Couldn't turn off network",
            body: `Turning off networking with nmcli failed${
                e?.message !== undefined ? `: ${e?.message}` : ""}`
        });
    });
}
