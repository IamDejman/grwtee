"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface InstagramPost {
  id: string;
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
}

// Fallback placeholder images
const placeholderImages = [
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop"
];

const placeholderItems = Array.from({ length: 6 }).map((_, i) => ({
  id: `placeholder-${i}`,
  media_url: placeholderImages[i % placeholderImages.length],
  permalink: "#",
  timestamp: new Date().toISOString(),
  isPlaceholder: true
}));

export function InstagramFeed() {
  const [posts, setPosts] = useState<Array<InstagramPost & { isPlaceholder?: boolean }>>(
    placeholderItems
  );
  const [loading, setLoading] = useState(true);

  const instagramUrl =
    process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/grwtee";

  useEffect(() => {
    async function loadInstagramPosts() {
      try {
        const res = await fetch("/api/instagram");
        const json = await res.json();

        if (json.success && json.data && json.data.length > 0) {
          setPosts(json.data);
        } else {
          // Keep placeholders if no posts found
          setPosts(placeholderItems);
        }
      } catch (error) {
        console.error("Failed to load Instagram posts:", error);
        // Keep placeholders on error
        setPosts(placeholderItems);
      } finally {
        setLoading(false);
      }
    }

    loadInstagramPosts();
  }, []);

  return (
    <section className="pattern-light py-16">
      <div className="container-shell">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
              Follow Our Journey
            </h2>
            <p className="mt-2 font-body text-base text-gray-dark/80">
              <span className="font-accent font-semibold text-teal-dark">
                @grwtee
              </span>{" "}
              — daily styling inspiration, client features, and curated looks.
            </p>
          </div>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 font-accent text-sm font-semibold text-teal-dark hover:text-purple-dark"
            aria-label="Open Instagram in a new tab"
          >
            <span className="h-2 w-2 rounded-full bg-gold" />
            Visit Instagram →
          </a>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {posts.slice(0, 6).map((post) => (
            <Link
              key={post.id}
              href={post.permalink}
              target={post.isPlaceholder ? undefined : "_blank"}
              rel={post.isPlaceholder ? undefined : "noreferrer"}
              className="group overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-gray-medium/40 transition hover:shadow-lg"
            >
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={post.media_url}
                  alt={post.caption || "Instagram post"}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  unoptimized={post.isPlaceholder ? false : true}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
