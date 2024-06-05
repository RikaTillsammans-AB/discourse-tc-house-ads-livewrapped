import discourseComputed from "discourse-common/utils/decorators";
import { withPluginApi } from "discourse/lib/plugin-api";
import { scheduleOnce } from "@ember/runloop";
import { isTesting } from "discourse-common/config/environment";
import { isBlank } from "@ember/utils";
import loadScript from "discourse/lib/load-script";
import RSVP from "rsvp";

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
    const AD_INTERVAL = settings.house_ads_livewrapped_ad_interval; // Use the setting value
    let adCounter = 0; // Initialize counter for unique ad IDs
    let postCounter = 0; // Initialize counter for posts

    withPluginApi("0.8.40", (api) => {
      window.lwhb = window.lwhb || { cmd: [] };
      window.googletag = window.googletag || { cmd: [] };
      
      api.onPageChange(() => {
        window.lwhb.cmd.push(() => {
          window.lwhb.resetPage(true);
        });
      });

      api.modifyClass("component:ad-slot", {
        pluginId: PLUGIN_ID,

        @discourseComputed("placement", "postNumber", "indexNumber")
        availableAdTypes(placement, postNumber, indexNumber) {
          return ["house-ad"];
        },
      });

      api.modifyClass("component:house-ad", {
        pluginId: PLUGIN_ID,
        // Remove classNameBindings

        @discourseComputed("adIndex")
        isValidAdSpot() {
          if (this.adIndex !== undefined && this.adIndex !== null && this.adIndex !== 0) {
            return 'active-ad-location';
          } else {
            return 'inactive-ad-location';
          }
        },

        _triggerAds() {
          if (isTesting() || this.adIndex < 1 || this.adIndex === null || this.adIndex === undefined) {
            return; // Don't load external JS during tests
          }

          loadGooglePublisherTagScript().then(() => {
            loadMainAdScript(settings.house_ads_livewrapped_source_script_pid).then(() => {
              window.lwhb.cmd.push(() => {
                window.lwhb.loadAd({
                  tagId: settings.house_ads_livewrapped_source_tag_id_base_string_desktop.replace("#", this.adIndex)
                });
                window.lwhb.loadAd({
                  tagId: settings.house_ads_livewrapped_source_tag_id_base_string_mobile.replace("#", this.adIndex)
                });
              });
              googletag.cmd.push(function() {
                googletag.pubads().setForceSafeFrame(true);
                googletag.pubads().disableInitialLoad();
                googletag.pubads().enableSingleRequest();
                googletag.enableServices();
              });
            });
          });
        },

        @discourseComputed("postNumber", "highest_post_number")
        adIndex(postNumber) {
          if (postNumber === undefined || postNumber === null) {
            return 0;
          }

          let topicLength = this.highest_post_number;
          let every = settings.house_ads_livewrapped_ad_interval; // Use the setting value
          let baseIndex = 0;

          if (postNumber !== topicLength) {
            if (settings.house_ads_livewrapped_always_start_at_op) {
              baseIndex = (postNumber + every - 1) / every;
            } else {
              baseIndex = postNumber / every;
            }
          } else {
            baseIndex = (postNumber + every - 1) / every;

            if (settings.house_ads_livewrapped_always_at_last_post) {
              baseIndex = Math.ceil(baseIndex);
            }
          }

          if (baseIndex != Math.floor(baseIndex)) {
            return 0;
          }

          if (baseIndex < 3) {
            return baseIndex;
          } else {
            return `2_${baseIndex - 2}`;
          }
        },

        @discourseComputed("adIndex")
        thisDesktopId(adIndex) {
          return settings.house_ads_livewrapped_source_tag_id_base_string_desktop.replace("#", adIndex);
        },

        @discourseComputed("adIndex")
        thisMobileId(adIndex) {
          return settings.house_ads_livewrapped_source_tag_id_base_string_mobile.replace("#", adIndex);
        },

        @discourseComputed("postNumber", "placement")
        showAfterPost(postNumber, placement) {
          if (!postNumber && placement !== "topic-list-between") {
            return true;
          }

          return true;
        },

        didInsertElement() {
          this._super();
          scheduleOnce("afterRender", this, this._triggerAds);
        
          if (this.element) {
            this.element.classList.add('responsive-ad'); // Add responsive-ad class
            this.element.classList.add(this.isValidAdSpot ? 'active-ad-location' : 'inactive-ad-location'); // Add valid ad spot class
          } else {
            console.error("Element is null or undefined");
          }
        },

        willDestroyElement() {
          window.lwhb.cmd.push(() => {
            window.lwhb.removeAdUnit({
              tagId: settings.house_ads_livewrapped_source_tag_id_base_string_desktop.replace("#", this.adIndex)
            });
            window.lwhb.removeAdUnit({
              tagId: settings.house_ads_livewrapped_source_tag_id_base_string_mobile.replace("#", this.adIndex)
            });
          });
        }
      });

      api.decorateCookedElement((element) => {
        if (!element) {
          console.error("Target element not found");
          return;
        }

        if (!element.classList.contains("cooked")) {
          console.log("Element does not contain 'cooked' class:", element);
          return;
        }

        postCounter += 1;

        // Check if an ad should be inserted
        if (postCounter === 1 || (postCounter - 1) % AD_INTERVAL === 0) {
          adCounter += 1;

          const adDivId = `rikatillsammans_desktop-panorama-1_${adCounter}`;

          let adDiv = document.createElement("div");
          adDiv.id = adDivId;
          adDiv.className = "responsive-ad"; // Add a class for styling
          adDiv.style.width = "100%";
          adDiv.style.height = "auto"; // Adjust height as necessary
          adDiv.style.margin = "10px 0";

          element.insertBefore(adDiv, element.nextSibling);

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
        }
      }, { class: "cooked" });
    });
  }
};