const PLATFORM = "GhostArchive";
const PLATFORM_BASE_URL = "https://ghostarchive.org";

// URL patterns
const REGEX_VIDEO_URL = /https:\/\/ghostarchive\.org\/varchive\/([\w\-_]+)/

// URL patterns - YouTube Video (to fetch archived versions)
// Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/v/,
//           youtube.com/shorts/, music.youtube.com/watch?v=
const REGEX_YOUTUBE_VIDEO_WATCH = /https?:\/\/(?:www\.|music\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([\w\-_]{11})/;
const REGEX_YOUTUBE_VIDEO_SHARE = /https?:\/\/youtu\.be\/([\w\-_]{11})/;
const REGEX_YOUTUBE_VIDEO_EMBED = /https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w\-_]{11})/;
const REGEX_YOUTUBE_VIDEO_V = /https?:\/\/(?:www\.)?youtube\.com\/v\/([\w\-_]{11})/;
const REGEX_YOUTUBE_VIDEO_SHORTS = /https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/([\w\-_]{11})/;

source.enable = function (conf) {
    /**
     * @param conf: SourceV8PluginConfig (the SomeConfig.js)
     */
}

source.getHome = function(continuationToken) {
    /**
     * @param continuationToken: any?
     * @returns: VideoPager
     */
    const videos = []; // The results (PlatformVideo)
    const hasMore = false; // Are there more pages?
    const context = { continuationToken: continuationToken }; // Relevant data for the next page
    return new SomeHomeVideoPager(videos, hasMore, context);
}

source.searchSuggestions = function(query) {
    /**
     * @param query: string
     * @returns: string[]
     */

    const suggestions = []; //The suggestions for a specific search query
    return suggestions;
}

source.getSearchCapabilities = function() {
    //This is an example of how to return search capabilities like available sorts, filters and which feed types are available (see source.js for more details) 
	return {
		types: [Type.Feed.Mixed],
		sorts: [Type.Order.Chronological, "^release_time"],
		filters: [
			{
				id: "date",
				name: "Date",
				isMultiSelect: false,
				filters: [
					{ id: Type.Date.Today, name: "Last 24 hours", value: "today" },
					{ id: Type.Date.LastWeek, name: "Last week", value: "thisweek" },
					{ id: Type.Date.LastMonth, name: "Last month", value: "thismonth" },
					{ id: Type.Date.LastYear, name: "Last year", value: "thisyear" }
				]
			},
		]
	};
}

source.search = function (query, type, order, filters, continuationToken) {
    /**
     * @param query: string
     * @param type: string
     * @param order: string
     * @param filters: Map<string, Array<string>>
     * @param continuationToken: any?
     * @returns: VideoPager
     */
    const videos = []; // The results (PlatformVideo)
    const hasMore = false; // Are there more pages?
    const context = { query: query, type: type, order: order, filters: filters, continuationToken: continuationToken }; // Relevant data for the next page
    return new SomeSearchVideoPager(videos, hasMore, context);
}

source.getSearchChannelContentsCapabilities = function () {
    //This is an example of how to return search capabilities on a channel like available sorts, filters and which feed types are available (see source.js for more details)
	return {
		types: [Type.Feed.Mixed],
		sorts: [Type.Order.Chronological],
		filters: []
	};
}

source.searchChannelContents = function (url, query, type, order, filters, continuationToken) {
    /**
     * @param url: string
     * @param query: string
     * @param type: string
     * @param order: string
     * @param filters: Map<string, Array<string>>
     * @param continuationToken: any?
     * @returns: VideoPager
     */

    const videos = []; // The results (PlatformVideo)
    const hasMore = false; // Are there more pages?
    const context = { channelUrl: channelUrl, query: query, type: type, order: order, filters: filters, continuationToken: continuationToken }; // Relevant data for the next page
    return new SomeSearchChannelVideoPager(videos, hasMore, context);
}

source.searchChannels = function (query, continuationToken) {
    /**
     * @param query: string
     * @param continuationToken: any?
     * @returns: ChannelPager
     */

    const channels = []; // The results (PlatformChannel)
    const hasMore = false; // Are there more pages?
    const context = { query: query, continuationToken: continuationToken }; // Relevant data for the next page
    return new SomeChannelPager(channels, hasMore, context);
}

source.isChannelUrl = function(url) {
    /**
     * @param url: string
     * @returns: boolean
     */

	return REGEX_CHANNEL_URL.test(url);
}

source.getChannel = function(url) {
	return new PlatformChannel({
		//... see source.js for more details
	});
}

source.getChannelContents = function(url, type, order, filters, continuationToken) {
    /**
     * @param url: string
     * @param type: string
     * @param order: string
     * @param filters: Map<string, Array<string>>
     * @param continuationToken: any?
     * @returns: VideoPager
     */

    const videos = []; // The results (PlatformVideo)
    const hasMore = false; // Are there more pages?
    const context = { url: url, query: query, type: type, order: order, filters: filters, continuationToken: continuationToken }; // Relevant data for the next page
    return new SomeChannelVideoPager(videos, hasMore, context);
}

source.isContentDetailsUrl = function(url) {
	return REGEX_VIDEO_URL.test(url) || isYouTubeVideoUrl(url);
}

source.getContentDetails = function(url) {
    const videoId = extractVideoId(url);

    if (!videoId) {
        throw new ScriptException("Invalid video URL: " + url);
    }

    // Use the JSON API for video details
    const apiUrl = `${PLATFORM_BASE_URL}/varchive/${videoId}`;
    const videoData = makeGetRequest(apiUrl, true, true);

    // Check if video is not archived (404)
    if (videoData && videoData.error) {
        if (videoData.code === 404) {
            // Video not archived - throw captcha exception to allow archiving
            const saveUrl = buildSaveUrl(videoId);
            log(`Video ${videoId} not archived. Redirecting to save page: ${saveUrl}`);

            throw new CaptchaRequiredException(saveUrl.url,
                saveUrl.body
            );
        }
        throw new ScriptException("Failed to fetch video details for: " + apiUrl);
    }

    if (!videoData) {
        throw new ScriptException("Failed to fetch video details for: " + apiUrl);
    }

    // Check if video is disabled
    if (videoData.disabled) {
        throw new UnavailableException("This video has been disabled");
    }

    const author = createAuthorLink(
        videoData.channelId || "unknown",
        videoData.channel || "Unknown",
        videoData.channelId ? `${PLATFORM_BASE_URL}/channel/${videoData.channelId}` : null,
        videoData.channelAvatar || ""
    );

    return new PlatformVideoDetails({
        id: createPlatformID(videoData.id),
        name: videoData.title || `Video ${videoData.id}`,
        thumbnails: new Thumbnails([new Thumbnail(videoData.thumbnail || "", 0)]),
        author: author,
        uploadDate: parseDate(videoData.published),
        duration: 0,
        viewCount: -1,
        url: `${PLATFORM_BASE_URL}/varchive/${videoData.id}`,
        isLive: false,
        description: videoData.description || "",
        video: getVideoSource(videoData)
    });
};

source.getComments = function (url, continuationToken) {
    /**
     * @param url: string
     * @param continuationToken: any?
     * @returns: CommentPager
     */

    const comments = []; // The results (Comment)
    const hasMore = false; // Are there more pages?
    const context = { url: url, continuationToken: continuationToken }; // Relevant data for the next page
    return new SomeCommentPager(comments, hasMore, context);

}
source.getSubComments = function (comment) {
    /**
     * @param comment: Comment
     * @returns: SomeCommentPager
     */

	if (typeof comment === 'string') {
		comment = JSON.parse(comment);
	}

	return getCommentsPager(comment.context.claimId, comment.context.claimId, 1, false, comment.context.commentId);
}

// Helper: Extract video ID from URL (supports Ghost Archive and YouTube URLs)
function extractVideoId(url) {
    // Try Ghost Archive URL first
    let match = url.match(REGEX_VIDEO_URL);
    if (match) return match[1];

    // Try all YouTube URL patterns
    match = url.match(REGEX_YOUTUBE_VIDEO_WATCH);
    if (match) return match[1];

    match = url.match(REGEX_YOUTUBE_VIDEO_SHARE);
    if (match) return match[1];

    match = url.match(REGEX_YOUTUBE_VIDEO_EMBED);
    if (match) return match[1];

    match = url.match(REGEX_YOUTUBE_VIDEO_V);
    if (match) return match[1];

    match = url.match(REGEX_YOUTUBE_VIDEO_SHORTS);
    if (match) return match[1];

    return null;
}

// Helper: Check if URL is a YouTube video URL
function isYouTubeVideoUrl(url) {
    return REGEX_YOUTUBE_VIDEO_WATCH.test(url) ||
           REGEX_YOUTUBE_VIDEO_SHARE.test(url) ||
           REGEX_YOUTUBE_VIDEO_EMBED.test(url) ||
           REGEX_YOUTUBE_VIDEO_V.test(url) ||
           REGEX_YOUTUBE_VIDEO_SHORTS.test(url);
}

// Helper: Make HTTP GET request
function makeGetRequest(url, parseJson = true, returnError = false) {
    try {
        const resp = http.GET(url, {headers: {
            'user-agent': "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.200 Mobile Safari/537.36"
        } });
        if (!resp.isOk) {
            if (returnError) {
                return { error: true, code: resp.code, body: resp.body };
            }
            log(`Request failed with status ${resp.code}: ${url}`);
            return null;
        }
        if (parseJson) {
            return JSON.parse(resp.body);
        }
        return resp.body;
    } catch (e) {
        log(`Request error: ${e.message}`);
        return null;
    }
}

// Helper: Build YouTube URL from video ID
function buildYouTubeUrl(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
}

// Helper: Build GhostArchive save URL for archiving
function buildSaveUrl(videoId) {
    const youtubeUrl = buildYouTubeUrl(videoId);
    const resp = http.GET(url, { headers: {
        'referer': 'https://ghostarchive.org/',
        'archive': youtubeUrl
    }});
    return resp;
}

// Helper: Create PlatformID
function createPlatformID(id) {
    return new PlatformID(PLATFORM, id, config?.id);
}

// Helper: Get video source descriptor
function getVideoSource(videoData) {
    const sourceUrl = videoData.source || `https://ghostvideo.b-cdn.net/video/${videoData.id}/${videoData.id}.mp4`;

    return new VideoSourceDescriptor([
        new VideoUrlSource({
            name: "MP4",
            container: "video/mp4",
            url: sourceUrl,
            width: 0,
            height: 0,
            duration: 0,
            codec: "vp9"
        })
    ]);
}


// Helper: Parse date string to Unix timestamp
function parseDate(dateStr) {
    if (!dateStr) return Math.floor(Date.now() / 1000);
    try {
        // Handle formats like "December 17, 2023" or ISO dates
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return Math.floor(Date.now() / 1000);
        }
        return Math.floor(date.getTime() / 1000);
    } catch (e) {
        return Math.floor(Date.now() / 1000);
    }
}

class SomeCommentPager extends CommentPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        return source.getComments(this.context.url, this.context.continuationToken);
    }
}

class SomeHomeVideoPager extends VideoPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.getHome(this.context.continuationToken);
	}
}

class SomeSearchVideoPager extends VideoPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.search(this.context.query, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
	}
}

class SomeSearchChannelVideoPager extends VideoPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.searchChannelContents(this.context.channelUrl, this.context.query, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
	}
}

class SomeChannelPager extends ChannelPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.searchChannelContents(this.context.query, this.context.continuationToken);
	}
}

class SomeChannelVideoPager extends VideoPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.getChannelContents(this.context.url, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
	}
}