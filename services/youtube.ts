/**
 * Fetches the title of a YouTube video using the noembed.com public API.
 * This allows us to get context for Gemini without a backend scraper.
 */
export const getVideoTitle = async (url: string): Promise<string> => {
  try {
    // Validate URL roughly
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      throw new Error("Invalid YouTube URL");
    }

    const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);
    const data = await response.json();

    if (data.error || !data.title) {
      throw new Error("Could not retrieve video information. Please check the URL.");
    }

    return data.title;
  } catch (error) {
    console.error("Error fetching video title:", error);
    throw error;
  }
};