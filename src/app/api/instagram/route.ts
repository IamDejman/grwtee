import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

interface InstagramPost {
  id: string;
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
}

async function fetchInstagramPosts(): Promise<InstagramPost[]> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  // If credentials are not configured, return empty array
  if (!accessToken || !userId) {
    return [];
  }

  try {
    // Fetch recent media from Instagram Graph API
    const response = await fetch(
      `https://graph.instagram.com/${userId}/media?fields=id,media_url,permalink,caption,timestamp&limit=6&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Instagram posts");
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Instagram API error:", error);
    return [];
  }
}

// Cache Instagram posts for 1 hour
const getCachedInstagramPosts = unstable_cache(
  fetchInstagramPosts,
  ["instagram-posts"],
  { revalidate: 60 * 60, tags: ["instagram"] }
);

export async function GET() {
  try {
    const posts = await getCachedInstagramPosts();

    return NextResponse.json({
      success: true,
      data: posts
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch Instagram posts" },
      { status: 500 }
    );
  }
}

