export interface VastAdData {
  videoUrl: string;
  clickThroughUrl: string | null;
  impressionUrls: string[];
  trackingEvents: { [key: string]: string[] };
}

/**
 * Fetches a VAST ad XML and parses it to retrieve the video URL, click-through, and trackers.
 * Includes CORS protection and falls back to a random video asset if loading fails.
 */
export async function fetchAndParseVast(vastUrl: string, fallbackVideos: string[]): Promise<VastAdData> {
  const fallbackAd: VastAdData = {
    videoUrl: fallbackVideos[Math.floor(Math.random() * fallbackVideos.length)],
    clickThroughUrl: vastUrl, // Falls back to the ad link itself
    impressionUrls: [],
    trackingEvents: {},
  };

  try {
    const response = await fetch(vastUrl, {
      headers: {
        'Accept': 'application/xml, text/xml, */*'
      }
    });

    if (!response.ok) {
      console.warn("Failed to fetch VAST tag. Using fallback video.", response.status);
      return fallbackAd;
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Check for XML parse errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      console.warn("VAST XML parsing error. Using fallback video.");
      return fallbackAd;
    }

    // 1. Get Media Files
    const mediaFiles = Array.from(xmlDoc.getElementsByTagName("MediaFile"));
    let selectedVideoUrl = "";

    // Prefer video/mp4 format
    const mp4File = mediaFiles.find(
      mf => mf.getAttribute("type")?.toLowerCase() === "video/mp4"
    );

    if (mp4File) {
      selectedVideoUrl = mp4File.textContent?.trim() || "";
    } else if (mediaFiles.length > 0) {
      // Use first available file
      selectedVideoUrl = mediaFiles[0].textContent?.trim() || "";
    }

    if (!selectedVideoUrl) {
      console.warn("No compatible MediaFile found in VAST XML. Using fallback.");
      selectedVideoUrl = fallbackAd.videoUrl;
    }

    // 2. Get ClickThrough URL
    const clickThroughTags = xmlDoc.getElementsByTagName("ClickThrough");
    let clickThroughUrl = clickThroughTags.length > 0 ? clickThroughTags[0].textContent?.trim() || null : null;

    if (!clickThroughUrl) {
      clickThroughUrl = fallbackAd.clickThroughUrl;
    }

    // 3. Get Impression Tracking URLs
    const impressionTags = xmlDoc.getElementsByTagName("Impression");
    const impressionUrls: string[] = [];
    for (let i = 0; i < impressionTags.length; i++) {
      const url = impressionTags[i].textContent?.trim();
      if (url) impressionUrls.push(url);
    }

    // 4. Get Event Tracking URLs
    const trackingTags = xmlDoc.getElementsByTagName("Tracking");
    const trackingEvents: { [key: string]: string[] } = {};
    for (let i = 0; i < trackingTags.length; i++) {
      const tag = trackingTags[i];
      const event = tag.getAttribute("event");
      const url = tag.textContent?.trim();
      if (event && url) {
        if (!trackingEvents[event]) {
          trackingEvents[event] = [];
        }
        trackingEvents[event].push(url);
      }
    }

    return {
      videoUrl: selectedVideoUrl,
      clickThroughUrl,
      impressionUrls,
      trackingEvents,
    };
  } catch (error) {
    console.error("Error loading or parsing VAST tag. Proceeding with fallback.", error);
    return fallbackAd;
  }
}

/**
 * Fires a tracking pixel/beacon to log ad stats with ExoClick.
 */
export function fireTrackingUrl(url: string) {
  if (!url) return;
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
    } else {
      const img = new Image();
      img.src = url;
    }
  } catch (err) {
    try {
      const img = new Image();
      img.src = url;
    } catch (e) {
      console.error("Failed to fire tracking beacon", e);
    }
  }
}
