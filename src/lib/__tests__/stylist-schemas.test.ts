/** @jest-environment node */
import { calendarDaySchema, lookbookSchema, lookPatchSchema, lookSchema } from "@/lib/stylist-schemas";

// What LookForm sends when editing: items still carry their database columns.
const lookFromForm = {
  title: " Office Monday ",
  description: "",
  occasion: "corporate",
  season: null,
  gender_target: null,
  body_shapes_suited: ["pear"],
  style_tags: ["Classic"],
  primary_image_url: "https://res.cloudinary.com/demo/look.jpg",
  is_premium: false,
  is_published: true,
  items: [
    {
      id: "6f1c2b8e-2a4b-4c1d-9e3f-0a1b2c3d4e5f",
      look_id: "0d8f0a52-3b7a-4f5e-8a61-1c2d3e4f5a6b",
      created_at: "2026-10-01T10:00:00Z",
      category: "top",
      name: "Silk blouse",
      brand: null,
      color: "",
      image_url: "",
      purchase_url: "https://shop.example.com/blouse",
      price: "1500.5",
      currency: "NGN",
      notes: null,
      sort_order: 0
    }
  ]
};

describe("lookSchema", () => {
  it("keeps only the fields the form edits", () => {
    const parsed = lookSchema.parse({ ...lookFromForm, likes_count: 9000, stylist_id: "x", id: "y" });
    expect(parsed).not.toHaveProperty("likes_count");
    expect(parsed).not.toHaveProperty("stylist_id");
    expect(parsed).not.toHaveProperty("id");
    expect(parsed.title).toBe("Office Monday");
    expect(parsed.description).toBeNull();
    expect(parsed.items?.[0]).toEqual({
      category: "top",
      name: "Silk blouse",
      brand: null,
      color: null,
      image_url: null,
      purchase_url: "https://shop.example.com/blouse",
      price: 1500.5,
      currency: "NGN",
      notes: null
    });
  });

  it("turns an empty price into null and refuses one that isn't a number", () => {
    const item = lookFromForm.items[0];
    expect(lookSchema.parse({ ...lookFromForm, items: [{ ...item, price: "" }] }).items?.[0].price).toBeNull();
    expect(lookSchema.safeParse({ ...lookFromForm, items: [{ ...item, price: "abc" }] }).success).toBe(false);
  });

  it("refuses links that aren't web addresses", () => {
    const item = lookFromForm.items[0];
    const result = lookSchema.safeParse({ ...lookFromForm, items: [{ ...item, purchase_url: "javascript:alert(1)" }] });
    expect(result.success).toBe(false);
  });

  it("needs a title, an occasion and a cover photo", () => {
    expect(lookSchema.safeParse({ ...lookFromForm, title: "  " }).success).toBe(false);
    expect(lookSchema.safeParse({ ...lookFromForm, occasion: null }).success).toBe(false);
    expect(lookSchema.safeParse({ ...lookFromForm, primary_image_url: null }).success).toBe(false);
  });
});

describe("lookPatchSchema", () => {
  it("changes only what was sent", () => {
    expect(lookPatchSchema.parse({ is_published: false, views_count: 1 })).toEqual({ is_published: false });
  });
});

describe("lookbookSchema", () => {
  const lookbook = {
    title: "Lagos wedding weekend",
    type: "wedding",
    custom_type: null,
    description: null,
    cover_image_url: null,
    event_date_start: "2026-12-18",
    event_date_end: "2026-12-20",
    status: "draft",
    assigned_to: "",
    is_published: false,
    show_in_feed: false,
    items: []
  };

  it("accepts what the form sends and treats no client as null", () => {
    const parsed = lookbookSchema.parse({ ...lookbook, owner_id: "someone-else", feed_published_at: "2020-01-01" });
    expect(parsed.assigned_to).toBeNull();
    expect(parsed).not.toHaveProperty("owner_id");
    expect(parsed).not.toHaveProperty("feed_published_at");
  });

  it("keeps an item's link to the wardrobe piece it came from", () => {
    const wardrobeItemId = "6f1c2b8e-2a4b-4c1d-9e3f-0a1b2c3d4e5f";
    const parsed = lookbookSchema.parse({
      ...lookbook,
      items: [{ id: "x", lookbook_id: "y", wardrobe_item_id: wardrobeItemId, name: "Blazer", price: "", sort_order: 0 }]
    });
    expect(parsed.items?.[0]).toMatchObject({ wardrobe_item_id: wardrobeItemId, name: "Blazer", price: null });
    expect(parsed.items?.[0]).not.toHaveProperty("lookbook_id");
  });

  it("refuses an end date before the start date", () => {
    expect(lookbookSchema.safeParse({ ...lookbook, event_date_end: "2026-12-01" }).success).toBe(false);
  });

  it("refuses a status the database doesn't have", () => {
    expect(lookbookSchema.safeParse({ ...lookbook, status: "archived" }).success).toBe(false);
  });
});

describe("calendarDaySchema", () => {
  it("drops the day's own id and calendar from the form's draft", () => {
    const parsed = calendarDaySchema.parse({
      id: "6f1c2b8e-2a4b-4c1d-9e3f-0a1b2c3d4e5f",
      calendar_id: "0d8f0a52-3b7a-4f5e-8a61-1c2d3e4f5a6b",
      date: "2026-11-03",
      occasion: "work",
      notes: "  ",
      primary_look_id: null,
      alternate_look_id: null,
      lookbook_id: null
    });
    expect(parsed).toEqual({
      date: "2026-11-03",
      occasion: "work",
      notes: null,
      primary_look_id: null,
      alternate_look_id: null,
      lookbook_id: null
    });
  });
});
