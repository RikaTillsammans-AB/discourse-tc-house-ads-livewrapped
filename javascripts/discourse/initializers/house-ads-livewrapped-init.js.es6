import discourseComputed from "discourse-common/utils/decorators";
import { withPluginApi } from "discourse/lib/plugin-api";
import { scheduleOnce } from "@ember/runloop";
import { isTesting } from "discourse-common/config/environment";
import { isBlank } from "@ember/utils";
import loadScript from "discourse/lib/load-script";
import RSVP from "rsvp";
//import { contentSecurityPolicy } from "discourse/lib/content-security-policy";

const PLUGIN_ID = "discourse-tc-ads-hack";
const LIVEWRAPPED_SCRIPT_SRC = "https://lwadm.com/lw/pbjs";
const GOOGLE_PUBLISHER_TAG_SCRIPT_SRC = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
let _mainLoaded = false,
  _mainPromise = null,
  _GPTLoaded = false,
  _GPTPromise = null,
  _c = 0;

function loadMainAdScript(pid) {
  if (_mainLoaded) {
    return RSVP.resolve();
  }

  if (_mainPromise) {
    return _mainPromise;
  }

  _mainPromise = loadScript(LIVEWRAPPED_SCRIPT_SRC + "?pid=" + pid, {
    scriptTag: true,
  }).then(function () {
    _mainLoaded = true;
  });

  return _mainPromise;
}

function loadGooglePublisherTagScript() {
  if (_GPTLoaded) {
    return RSVP.resolve();
  }

  if (_GPTPromise) {
    return _GPTPromise;
  }

  _GPTPromise = loadScript(GOOGLE_PUBLISHER_TAG_SCRIPT_SRC, {
    scriptTag: true,
  }).then(function () {
    _GPTLoaded = true;
  });

  return _GPTPromise;
}

export default {
  name: "house-ads-livewrapped",
  initialize() {
    let adCounter = 0; // Initialize counter for unique ad IDs
    withPluginApi("0.8.40", (api) => {
      window.lwhb = window.lwhb || { cmd: [] };
      window.googletag = window.googletag || { cmd: [] };
      api.decorateCookedElement(
        (element) => {
          if (!element) {
            console.error("Target element not found");
            return;
          }

          if (!element.classList.contains("cooked")) {
            console.log("Element does not contain 'cooked' class:", element);
            return;
          }

          // Increment the ad counter
          adCounter += 1;

          // Create the unique ID for the ad div
          const adDivId = `rikatillsammans_desktop-panorama-1_${adCounter}`;

          // Create the ad div
          let adDiv = document.createElement("div");
          adDiv.id = adDivId;
          adDiv.style.width = "100%";
          adDiv.style.height = "250px"; // Adjust height as necessary
          adDiv.style.margin = "10px 0";

          // Insert the ad div after the current post element
          element.insertBefore(adDiv, element.nextSibling);

          // Schedule the script execution after rendering
          scheduleOnce("afterRender", this, () => {
            const nonce = document.querySelector('script[nonce]')?.getAttribute('nonce');
            loadGooglePublisherTagScript(nonce)
              .then(() => loadMainAdScript(settings.house_ads_livewrapped_source_script_pid, nonce))
              .then(() => {
                window.lwhb.cmd.push(() => {
                  window.lwhb.loadAd({ tagId: adDivId });
                });
                googletag.cmd.push(function () {
                  googletag.pubads().setForceSafeFrame(true);
                  googletag.pubads().disableInitialLoad();
                  googletag.pubads().enableSingleRequest();
                  googletag.enableServices();
                });
              })
              .catch((error) => {
                console.error('Error loading scripts:', error);
              });
          });
        },
        { class: "cooked" } // Ensure it runs for each post
      );
    });
  },
};