// PostHog for the marketing site, in the same project as app.dreamscalelabs.com.
// The cookie is shared across *.dreamscalelabs.com, so a visitor keeps one ID from
// the site into the app, and the app's identify() joins these visits to the account.
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

posthog.init("phc_tS6Y9rxxJoxJXGMEeiF9m7ynhZS2Rv7x2FXsWA2MXX5V", {
  api_host: "https://v.dreamscalelabs.com",
  ui_host: "https://us.posthog.com",
  defaults: "2026-08-30",
  cross_subdomain_cookie: true,
  persistence: "localStorage+cookie",
  person_profiles: "identified_only",
  capture_pageview: true,
  capture_pageleave: true,
  autocapture: false,
  capture_heatmaps: false,
  capture_dead_clicks: false,
  capture_exceptions: false,
  disable_session_recording: true,
  advanced_disable_feature_flags: true,
});

// Links that leave the page (Get started, Sign in, docs, demo, socials). GA can't
// see clicks into app.dreamscalelabs.com, so this event is the site-to-app step.
document.addEventListener("click", (event) => {
  const link = event.target instanceof Element && event.target.closest("a[href]");
  if (!link) return;
  const url = new URL(link.href, window.location.href);
  if (url.host === window.location.host) return;
  posthog.capture(
    "marketing_link_clicked",
    {
      link_url: url.href,
      link_host: url.host || url.protocol.replace(":", ""),
      link_text: link.textContent.trim().replace(/\s+/g, " ").slice(0, 100),
      link_area: link.closest("header, footer, aside, nav")?.localName ?? "main",
    },
    { send_instantly: true, transport: "sendBeacon" },
  );
});
