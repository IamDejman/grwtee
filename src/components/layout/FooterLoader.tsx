"use client";

import { useEffect } from "react";

export function FooterLoader() {
  useEffect(() => {
    // Mark page as loaded when component mounts
    document.body.classList.add("loaded");
  }, []);

  return null;
}

