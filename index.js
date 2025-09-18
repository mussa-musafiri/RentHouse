// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// supabase client (service role key - keep server-side only)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const BUCKET = process.env.BUCKET_NAME || "property-media";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Multer for file uploads (memoryStorage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// helper: build public url for a path in the public bucket
function publicUrlForPath(path) {
  if (!path) return null;
  // public bucket URL pattern
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// ---------- ROUTES ----------

// Health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Create house (multipart form-data: image, video)
app.post("/api/houses", upload.fields([{ name: "image" }, { name: "video" }]), async (req, res) => {
  try {
    const { title, price, location, owner, description, phone } = req.body;

    let image_url = null;
    let video_url = null;

    // upload image if provided
    if (req.files && req.files.image && req.files.image[0]) {
      const f = req.files.image[0];
      const path = `images/${Date.now()}-${f.originalname.replace(/\s+/g, "_")}`;
      const { data, error } = await supabase.storage.from(BUCKET).upload(path, f.buffer, {
        contentType: f.mimetype
      });
      if (error) throw error;
      image_url = publicUrlForPath(data.path);
    }

    // upload video if provided
    if (req.files && req.files.video && req.files.video[0]) {
      const f = req.files.video[0];
      const path = `videos/${Date.now()}-${f.originalname.replace(/\s+/g, "_")}`;
      const { data, error } = await supabase.storage.from(BUCKET).upload(path, f.buffer, {
        contentType: f.mimetype
      });
      if (error) throw error;
      video_url = publicUrlForPath(data.path);
    }

    const { data, error } = await supabase
      .from("properties")
      .insert([{ title, price, location, owner, description, phone, image_url, video_url }])
      .select();

    if (error) throw error;
    res.json({ success: true, property: data[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// Get all houses
app.get("/api/houses", async (req, res) => {
  try {
    const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// Update house (multipart allowed: image/video optional)
app.put("/api/houses/:id", upload.fields([{ name: "image" }, { name: "video" }]), async (req, res) => {
  const { id } = req.params;
  try {
    const { title, price, location, owner, description, phone } = req.body;

    // fetch existing record
    const { data: old, error: fetchErr } = await supabase.from("properties").select("image_url, video_url").eq("id", id).single();
    if (fetchErr) throw fetchErr;
    if (!old) return res.status(404).json({ error: "Property not found" });

    let image_url = old.image_url;
    let video_url = old.video_url;

    // replace image
    if (req.files && req.files.image && req.files.image[0]) {
      // delete old if exists
      if (old.image_url) {
        const oldPath = old.image_url.split(`/${BUCKET}/`)[1] || old.image_url.split(`/object/public/${BUCKET}/`)[1];
        if (oldPath) {
          await supabase.storage.from(BUCKET).remove([oldPath]);
        }
      }
      const f = req.files.image[0];
      const path = `images/${Date.now()}-${f.originalname.replace(/\s+/g, "_")}`;
      const { data, error } = await supabase.storage.from(BUCKET).upload(path, f.buffer, { contentType: f.mimetype });
      if (error) throw error;
      image_url = publicUrlForPath(data.path);
    }

    // replace video
    if (req.files && req.files.video && req.files.video[0]) {
      if (old.video_url) {
        const oldPath = old.video_url.split(`/${BUCKET}/`)[1] || old.video_url.split(`/object/public/${BUCKET}/`)[1];
        if (oldPath) {
          await supabase.storage.from(BUCKET).remove([oldPath]);
        }
      }
      const f = req.files.video[0];
      const path = `videos/${Date.now()}-${f.originalname.replace(/\s+/g, "_")}`;
      const { data, error } = await supabase.storage.from(BUCKET).upload(path, f.buffer, { contentType: f.mimetype });
      if (error) throw error;
      video_url = publicUrlForPath(data.path);
    }

    const updates = { title, price, location, owner, description, phone, image_url, video_url };
    const { data: updated, error: updErr } = await supabase.from("properties").update(updates).eq("id", id).select();
    if (updErr) throw updErr;
    res.json({ success: true, property: updated[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// Delete house + media
app.delete("/api/houses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data: house, error: fetchError } = await supabase.from("properties").select("image_url, video_url").eq("id", id).single();
    if (fetchError) throw fetchError;

    if (house.image_url) {
      const p = house.image_url.split(`/${BUCKET}/`)[1] || house.image_url.split(`/object/public/${BUCKET}/`)[1];
      if (p) {
        const { error } = await supabase.storage.from(BUCKET).remove([p]);
        if (error) console.warn("image delete warning:", error.message);
      }
    }

    if (house.video_url) {
      const p = house.video_url.split(`/${BUCKET}/`)[1] || house.video_url.split(`/object/public/${BUCKET}/`)[1];
      if (p) {
        const { error } = await supabase.storage.from(BUCKET).remove([p]);
        if (error) console.warn("video delete warning:", error.message);
      }
    }

    const { error: delErr } = await supabase.from("properties").delete().eq("id", id);
    if (delErr) throw delErr;

    res.json({ success: true, message: "Deleted property and media" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// Select a house (store selection)
app.post("/api/select-house", async (req, res) => {
  try {
    const { user_id, property_id } = req.body;
    const { data, error } = await supabase.from("selected_properties").insert([{ user_id, property_id }]).select();
    if (error) throw error;
    res.json({ success: true, selection: data[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// Get selected houses (joined with properties)
app.get("/api/selected-houses", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("selected_properties")
      .select("id, user_id, selected_at, property_id, properties(*)")
      .order("selected_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// List users (site_users) - optional
app.get("/api/users", async (req, res) => {
  try {
    const { data, error } = await supabase.from("site_users").select("full_name, phone, is_admin").order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`RentHub backend listening on port ${PORT}`);
});
