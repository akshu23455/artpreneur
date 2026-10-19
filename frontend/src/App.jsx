import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

const sampleArtworks = [
  {
    id: "sample-1",
    title: "Golden Sunflowers",
    description: "A celebration of warmth, light, and golden blooms.",
    category: "Physical",
    price: 2499,
    artist: "Vincent van Gogh",
    image: "/sunflower.png",
    sample: true,
  },
  {
    id: "sample-2",
    title: "The Golden Terrace",
    description: "An evening filled with colour and quiet beauty.",
    category: "Physical",
    price: 3499,
    artist: "Vincent van Gogh",
    image: "/cafe-terrace.png",
    sample: true,
  },
];

const formatPrice = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

function App({ user, profile, onSignOut }) {
  const [artworks, setArtworks] = useState([]);
  const [filter, setFilter] = useState("All");
  const [cart, setCart] = useState([]);
  const [liked, setLiked] = useState([]);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState("");

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderError, setOrderError] = useState("");

  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [inspiration, setInspiration] = useState("");
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [aiError, setAiError] = useState("");
  const [category, setCategory] = useState("Physical");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [editingArtwork, setEditingArtwork] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", category: "Physical", price: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingArtworkId, setDeletingArtworkId] = useState(null);

  const role = profile?.role?.toLowerCase();
  const isArtist = role === "artist";

  const loadArtworks = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("artworks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
const artistIds = [...new Set(
  (data || []).map((art) => art.artist_id).filter(Boolean)
)];

const { data: artistProfiles, error: profilesError } = await supabase
  .from("profiles")
  .select("id, full_name")
  .in("id", artistIds);

if (profilesError) {
  console.error("Artist profiles error:", profilesError);
}

const artistNames = Object.fromEntries(
  (artistProfiles || []).map((p) => [p.id, p.full_name])
);
      const uploaded = (data || []).map((art) => {
        const { data: imageData } = supabase.storage
          .from("artworks")
          .getPublicUrl(art.image_path);

        return {
          ...art,
          artist:
  artistNames[art.artist_id] ||
  (art.artist_id === user?.id ? profile?.full_name : null) ||
  "Independent Artist",
          image: imageData.publicUrl,
          sample: false,
        };
      });

      setArtworks(uploaded);
    } catch (error) {
      console.error("Artwork loading error:", error);
      setMessage(`Unable to load artworks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.full_name]);

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setLoadingOrders(true);
    setOrderError("");

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, total_amount, status, payment_status, created_at"
        )
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error("Order history error:", error);
      setOrders([]);
      setOrderError(error.message);
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.id]);

  const loadSales = useCallback(async () => {
    if (!user?.id || !isArtist) {
      setSales([]);
      return;
    }

    setLoadingSales(true);
    setSalesError("");

    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, order_id, artwork_id, artist_id, price")
        .eq("artist_id", user.id);

      if (error) throw error;

      setSales(data || []);
    } catch (error) {
      console.error("Artist sales error:", error);
      setSalesError(error.message);
      setSales([]);
    } finally {
      setLoadingSales(false);
    }
  }, [user?.id, isArtist]);

  useEffect(() => {
    loadArtworks();
  }, [loadArtworks]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        loadOrders();
        loadSales();
      }
    }

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible
    );

    return () =>
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      );
  }, [loadOrders, loadSales]);

  useEffect(() => {
    if (!imageFile) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  }

  function toggleLike(id) {
    setLiked((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  }

  function addToCart(art) {
    if (art.sample) {
      setMessage("Demo artworks cannot be purchased.");
      return;
    }

    if (art.artist_id === user?.id) {
      setMessage("You cannot purchase your own artwork.");
      return;
    }

    if (cart.some((item) => item.id === art.id)) {
      setMessage("This artwork is already in your cart.");
      return;
    }

    setCart((previous) => [...previous, art]);
    setMessage(`${art.title} added to your cart!`);
  }

  function removeFromCart(id) {
    setCart((previous) =>
      previous.filter((item) => item.id !== id)
    );
  }

  async function placeOrder() {
    if (!user?.id || cart.length === 0) {
      setMessage("Please add an artwork to your cart.");
      return;
    }

    if (
      cart.some(
        (item) =>
          item.sample || item.artist_id === user.id
      )
    ) {
      setMessage("Your cart contains an unavailable artwork.");
      return;
    }

    setCheckingOut(true);
    setMessage("");

    try {
      const { error } = await supabase.rpc(
        "place_art_order",
        {
          p_artwork_ids: cart.map((item) => item.id),
        }
      );

      if (error) throw error;

      setCart([]);
      await loadOrders();
      await loadSales();

      setMessage("Your test order was placed successfully! 🌻");
      scrollTo("orders");
    } catch (error) {
      console.error("Checkout error:", error);
      setMessage(`Checkout failed: ${error.message}`);
    } finally {
      setCheckingOut(false);
    }
  }

  async function generateAiDescription() {
    if (!title.trim() || !inspiration.trim()) {
      setAiError("Enter an artwork title and your inspiration first.");
      return;
    }

    setGeneratingDescription(true);
    setAiError("");
    try {
      const response = await fetch(
        import.meta.env.VITE_AI_API_URL || "https://artpreneur.onrender.com/generate-description",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), idea: inspiration.trim() }),
        }
      );
      if (!response.ok) {
        let detail = `AI request failed (${response.status}).`;
        try {
          const data = await response.json();
          if (typeof data.detail === "string") detail = data.detail;
        } catch { /* Keep the HTTP error. */ }
        throw new Error(detail);
      }
      const data = await response.json();
      const generated = typeof data.description === "string"
        ? data.description
        : Array.isArray(data.description)
          ? data.description.filter((part) => part?.type === "text")
              .map((part) => part.text).filter(Boolean).join("\n")
          : "";
      if (!generated.trim()) throw new Error("AI returned an empty description.");
      setDescription(generated.trim());
      setMessage("AI description generated! Review it before publishing. ✨");
    } catch (error) {
      console.error("AI description error:", error);
      setAiError(`${error.message} Check that your backend is running and CORS is enabled.`);
    } finally {
      setGeneratingDescription(false);
    }
  }

  async function publishArtwork(event) {
    event.preventDefault();
    setMessage("");

    if (!isArtist || !user?.id) {
      setMessage("Only artists can publish artwork.");
      return;
    }

    if (!imageFile || !imageFile.type.startsWith("image/")) {
      setMessage("Please choose a valid artwork image.");
      return;
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      setMessage("Please choose an image under 5 MB.");
      return;
    }

    if (!title.trim() || !description.trim()) {
      setMessage("Please complete the artwork details.");
      return;
    }

    if (
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0
    ) {
      setMessage("Please enter a valid price.");
      return;
    }

    setPublishing(true);

    try {
      const extension =
        imageFile.name.split(".").pop()?.toLowerCase() || "jpg";

      const imagePath =
        `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("artworks")
        .upload(imagePath, imageFile, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: databaseError } = await supabase
        .from("artworks")
        .insert({
          artist_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          price: Number(price),
          image_path: imagePath,
        });

      if (databaseError) {
        await supabase.storage
          .from("artworks")
          .remove([imagePath]);

        throw databaseError;
      }

      setTitle("");
      setDescription("");
      setInspiration("");
      setAiError("");
      setCategory("Physical");
      setPrice("");
      setImageFile(null);

      await loadArtworks();
      setMessage("Your masterpiece has been published! 🌻");
      scrollTo("dashboard");
    } catch (error) {
      console.error("Publishing error:", error);
      setMessage(`Publishing failed: ${error.message}`);
    } finally {
      setPublishing(false);
    }
  }

  function startEditingArtwork(art) {
    if (!isArtist || !user?.id || art.artist_id !== user.id) return;
    setEditingArtwork(art);
    setTimeout(() => document.getElementById("edit-artwork")?.scrollIntoView({ behavior: "smooth" }), 0);
    setEditForm({ title: art.title, description: art.description, category: art.category, price: String(art.price) });
    setMessage("");
  }

  async function saveArtworkEdit(event) {
    event.preventDefault();
    if (!editingArtwork || !user?.id || editingArtwork.artist_id !== user.id) return;
    const updatedPrice = Number(editForm.price);
    if (!editForm.title.trim() || !editForm.description.trim() ||
        !["Physical", "Digital"].includes(editForm.category) ||
        !Number.isFinite(updatedPrice) || updatedPrice <= 0) {
      setMessage("Please provide a title, description, category and valid positive price.");
      return;
    }
    setSavingEdit(true);
    try {
      const { data, error } = await supabase.from("artworks")
        .update({ title: editForm.title.trim(), description: editForm.description.trim(),
          category: editForm.category, price: updatedPrice })
        .eq("id", editingArtwork.id).eq("artist_id", user.id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No artwork updated. Check your Supabase update policy.");
      setEditingArtwork(null);
      await loadArtworks();
      setMessage("Artwork updated successfully! 🎨");
    } catch (error) {
      setMessage(`Update failed: ${error.message}`);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteArtwork(art) {
    if (!isArtist || !user?.id || art.artist_id !== user.id) return;
    if (!window.confirm(`Delete “${art.title}” from your collection? This cannot be undone.`)) return;
    setDeletingArtworkId(art.id);
    try {
      // Keep storage images for order records and recovery; remove only the listing.
      const { data, error } = await supabase.from("artworks").delete()
        .eq("id", art.id).eq("artist_id", user.id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No artwork deleted. Check your Supabase delete policy or order references.");
      setCart((previous) => previous.filter((item) => item.id !== art.id));
      await loadArtworks();
      setMessage("Artwork listing deleted. Its stored image was retained for recovery.");
    } catch (error) {
      setMessage(`Deletion failed: ${error.message}`);
    } finally {
      setDeletingArtworkId(null);
    }
  }

  const myArtworks = artworks.filter(
    (art) => art.artist_id === user?.id
  );

  const pendingOrderValue = sales.reduce(
    (sum, sale) => sum + Number(sale.price),
    0
  );

  const allArtworks = [...artworks, ...sampleArtworks];

  const visibleArtworks = allArtworks.filter(
    (art) => filter === "All" || art.category === filter
  );

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price),
    0
  );

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <a className="logo" href="#home">
          ARTPRENEUR 🌻
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#gallery">Explore Art</a>
          <a href="#founder">Meet the Founder</a>

          {isArtist && (
            <>
              <a href="#studio">Artist Studio</a>
              <a href="#dashboard">My Dashboard</a>
            </>
          )}

          <a href="#cart">My Cart</a>
          <a href="#orders">My Orders</a>
        </div>

        <div className="nav-actions">
          <span className="role-label">
            {isArtist ? "🎨 Artist" : "🛍️ Buyer"}
          </span>

          <button
            className="nav-button"
            onClick={onSignOut}
          >
            Sign Out →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-content">
          <span className="section-eyebrow">
            ✦ WELCOME TO YOUR CREATIVE WORLD ✦
          </span>

          <h1>
            <span className="hero-first-line">
              Where Art
            </span>

            <span className="hero-second-line">
              Meets Ambition.
            </span>
          </h1>

          <p className="hero-description">
            Where imagination takes shape,
            <br />
            and creativity finds its worth.
          </p>

          <div className="hero-buttons">
            {isArtist && (
              <button
                className="primary-btn"
                onClick={() => scrollTo("studio")}
              >
                Enter Your Studio →
              </button>
            )}

            <button
              className={
                isArtist ? "secondary-btn" : "primary-btn"
              }
              onClick={() => scrollTo("gallery")}
            >
              Explore Gallery
            </button>
          </div>

          <div className="hero-caption">
            ✦ EVERY STROKE TELLS A STORY ✦
          </div>
        </div>
      </section>

      {/* MEET THE FOUNDER — visible to both artists and buyers */}
      <section className="founder-section" id="founder" aria-labelledby="founder-title">
        <div className="founder-inner">
          <div className="founder-photo-wrap">
            <img
              className="founder-photo"
              src="/founder-akshaya.jpeg"
              alt="Akshaya, founder of Artpreneur"
              loading="lazy"
            />
          </div>
          <div className="founder-story">
            <span className="founder-eyebrow">✦ A LITTLE PIECE OF MY HEART ✦</span>
            <h2 id="founder-title">Meet the Founder</h2>
            <h3>Akshaya G.</h3>
            <p className="founder-quote">
              “Some emotions find their way into words. Mine have always found their way into art.”
            </p>
            <p>
              Art, to me, is a beautiful emotion that unites us all. From those random childhood
              doodles to finding my safest space in art, I've always felt a magnetic connection
              with it. In a world where digital memories can vanish in seconds, I believe the
              effort and emotions behind every creation deserve to be preserved for ages.
              Every stroke carries a million unspoken thoughts and feelings. And I hope my
              fellow art people find their own little space of comfort, expression, and
              escapism here. 🌻
            </p>
            <p className="founder-signature">With love, Akshaya ♡</p>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="gallery" id="gallery">
        <div className="section-heading">
          <span className="section-eyebrow">
            ✦ DISCOVER CREATIVITY ✦
          </span>

          <h2>The Art Marketplace</h2>

          <p>
            Discover meaningful creations,
            <br />
            support independent artists.
          </p>
        </div>

        <div className="market-toolbar">
          <div className="filter-buttons">
            {["All", "Physical", "Digital"].map((item) => (
              <button
                key={item}
                className={
                  filter === item
                    ? "filter-btn active"
                    : "filter-btn"
                }
                onClick={() => setFilter(item)}
              >
                {item === "All"
                  ? "All Artworks"
                  : item}
              </button>
            ))}
          </div>

          <button
            className="cart-shortcut"
            onClick={() => scrollTo("cart")}
          >
            🛍️ My Cart ({cart.length})
          </button>
        </div>

        {loading && (
          <p className="status-text">
            Loading masterpieces...
          </p>
        )}

        <div className="gallery-grid">
          {visibleArtworks.map((art) => (
            <article className="art-card" key={art.id}>
              <div className="art-preview">
                <img src={art.image} alt={art.title} />

                <span className="art-type">
                  {art.sample
                    ? "Gallery Demo"
                    : art.category}
                </span>

                <button
                  className="like-btn"
                  onClick={() => toggleLike(art.id)}
                  aria-label={`Like ${art.title}`}
                  aria-pressed={liked.includes(art.id)}
                >
                  {liked.includes(art.id)
                    ? "♥"
                    : "♡"}
                </button>
              </div>

              <div className="art-details">
                <span className="artist-name">
                  BY {art.artist}
                </span>

                <h3>{art.title}</h3>
                <p>{art.description}</p>

                <div className="art-bottom">
                  <strong>
                    {formatPrice(art.price)}
                  </strong>

                  <button
                    className="buy-button"
                    disabled={
                      art.sample ||
                      art.artist_id === user?.id
                    }
                    onClick={() => addToCart(art)}
                  >
                    {art.sample
                      ? "Display Only"
                      : art.artist_id === user?.id
                      ? "Your Artwork"
                      : "Add to Cart →"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!loading &&
          visibleArtworks.length === 0 && (
            <p className="status-text">
              No artworks in this category yet. 🌻
            </p>
          )}
      </section>

      {/* ARTIST DASHBOARD */}
      {isArtist && (
        <section className="artist-dashboard" id="dashboard">
          <div className="section-heading">
            <span className="section-eyebrow">
              ✦ YOUR ARTISTIC WORLD ✦
            </span>

            <h2>My Creative Studio</h2>

            <p>
              Every creation has a story.
              <br />
              Here's yours. 🌻
            </p>
          </div>

          <div className="dashboard-stats">
            <div className="dashboard-stat-card">
              <span>My Artworks</span>
              <strong>{myArtworks.length}</strong>
              <p>Original creations published</p>
            </div>

            <div className="dashboard-stat-card">
              <span>Ordered Artworks</span>
              <strong>{sales.length}</strong>
              <p>Test order line items</p>
            </div>

            <div className="dashboard-stat-card">
              <span>Order Value</span>
              <strong>
                {formatPrice(pendingOrderValue)}
              </strong>
              <p>Not confirmed earnings</p>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h3>My Collection 🎨</h3>

              <button
                className="dashboard-action"
                onClick={() => scrollTo("studio")}
              >
                + Add Artwork
              </button>
            </div>

            {loading ? (
              <p>Loading your collection...</p>
            ) : myArtworks.length === 0 ? (
              <p>
                Your collection is waiting for its
                first masterpiece.
              </p>
            ) : (
              <div className="collection-grid">
                {myArtworks.map((art) => (
                  <div
                    className="collection-card"
                    key={art.id}
                  >
                    <img
                      src={art.image}
                      alt={art.title}
                    />

                    <div className="collection-card-info">
                      <h4>{art.title}</h4>
                      <p>{art.category} Artwork</p>
                      <strong>
                        {formatPrice(art.price)}
                      </strong>
                      <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                        <button type="button" className="dashboard-action" onClick={() => startEditingArtwork(art)}>Edit</button>
                        <button type="button" className="dashboard-action" disabled={deletingArtworkId === art.id}
                          onClick={() => deleteArtwork(art)}>
                          {deletingArtworkId === art.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {editingArtwork && (
            <div className="dashboard-panel" id="edit-artwork">
              <h3>Edit Artwork 🎨</h3>
              <form className="upload-box" onSubmit={saveArtworkEdit}>
                <label htmlFor="edit-title">Title</label>
                <input id="edit-title" required value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
                <label htmlFor="edit-description">Description</label>
                <textarea id="edit-description" required rows={4} value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
                <label htmlFor="edit-category">Artwork Type</label>
                <select id="edit-category" value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}>
                  <option value="Physical">Physical Artwork</option>
                  <option value="Digital">Digital Artwork</option>
                </select>
                <label htmlFor="edit-price">Selling Price (₹)</label>
                <input id="edit-price" type="number" min="0.01" step="0.01" required value={editForm.price}
                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
                <button className="publish-button" type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className="dashboard-action" onClick={() => setEditingArtwork(null)}>Cancel</button>
              </form>
            </div>
          )}

          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h3>Incoming Orders 🛍️</h3>

              <button
                className="dashboard-action"
                onClick={loadSales}
                disabled={loadingSales}
              >
                Refresh ↻
              </button>
            </div>

            {salesError && (
              <p role="alert">
                Unable to load orders: {salesError}
              </p>
            )}

            {loadingSales ? (
              <p>Loading incoming orders...</p>
            ) : sales.length === 0 ? (
              <p>
                No orders for your artwork yet. 🌻
              </p>
            ) : (
              <div className="sales-list">
                {sales.map((sale) => {
                  const artwork = myArtworks.find(
                    (art) =>
                      art.id === sale.artwork_id
                  );

                  return (
                    <div
                      className="sale-row"
                      key={sale.id}
                    >
                      <div>
                        <h4>
                          {artwork?.title ||
                            "Artwork Order"}
                        </h4>

                        <p>
                          Order #
                          {sale.order_id.slice(0, 8)}
                        </p>

                        <small>
                          Test order · Payment not verified
                        </small>
                      </div>

                      <strong>
                        {formatPrice(sale.price)}
                      </strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ARTIST UPLOAD */}
      {isArtist && (
        <section className="studio" id="studio">
          <div className="section-heading">
            <span className="section-eyebrow">
              ✦ YOUR CREATIVE SPACE ✦
            </span>

            <h2>The Artist's Studio</h2>

            <p>
              Every masterpiece deserves
              <br />
              a place in the world.
            </p>
          </div>

          <form
            className="upload-box"
            onSubmit={publishArtwork}
          >
            <div className="upload-icon">🎨</div>

            <h3>Share Your Masterpiece</h3>
            <p>
              Upload your creation and give it a story.
            </p>

            <label htmlFor="artwork-image">
              Choose Artwork Image
            </label>

            <input
              id="artwork-image"
              type="file"
              accept="image/*"
              required
              onChange={(e) =>
                setImageFile(
                  e.target.files?.[0] || null
                )
              }
            />

            {preview && (
              <div className="artwork-preview">
                <img
                  src={preview}
                  alt="Artwork preview"
                />
              </div>
            )}

            <label htmlFor="artwork-title">
              Artwork Title
            </label>

            <input
              id="artwork-title"
              type="text"
              placeholder="A Starry Dream"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              required
            />

            <label htmlFor="artwork-inspiration">
              Your Inspiration / Idea
            </label>
            <textarea
              id="artwork-inspiration"
              placeholder="What inspired this artwork? Tell AI what it means to you..."
              value={inspiration}
              onChange={(e) => setInspiration(e.target.value)}
              rows={3}
            />
            <button
              className="publish-button"
              type="button"
              onClick={generateAiDescription}
              disabled={generatingDescription || publishing}
              style={{ marginBottom: "16px" }}
            >
              {generatingDescription ? "✨ Generating..." : "✨ Generate with AI"}
            </button>
            {aiError && <p role="alert" style={{ color: "#b42318" }}>{aiError}</p>}

            <label htmlFor="artwork-description">
              Description
            </label>

            <textarea
              id="artwork-description"
              placeholder="Tell the story behind your artwork..."
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              rows={4}
              required
            />

            <label htmlFor="artwork-category">
              Artwork Type
            </label>

            <select
              id="artwork-category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
            >
              <option value="Physical">
                Physical Artwork
              </option>

              <option value="Digital">
                Digital Artwork
              </option>
            </select>

            <label htmlFor="artwork-price">
              Selling Price (₹)
            </label>

            <input
              id="artwork-price"
              type="number"
              min="1"
              step="0.01"
              placeholder="2499"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value)
              }
              required
            />

            <button
              className="publish-button"
              type="submit"
              disabled={publishing}
            >
              {publishing
                ? "Publishing your masterpiece..."
                : "Publish Artwork →"}
            </button>
          </form>
        </section>
      )}

      {/* CART */}
      <section className="cart-section" id="cart">
        <div className="section-heading">
          <span className="section-eyebrow">
            ✦ YOUR SELECTED MASTERPIECES ✦
          </span>

          <h2>My Art Cart</h2>
        </div>

        <div className="cart-box">
          {cart.length === 0 ? (
            <p className="empty-cart">
              Your cart is waiting for a masterpiece. 🌻
            </p>
          ) : (
            <>
              {cart.map((item) => (
                <div
                  className="cart-item"
                  key={item.id}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                  />

                  <div className="cart-item-info">
                    <h3>{item.title}</h3>
                    <p>{item.category} Artwork</p>

                    <strong>
                      {formatPrice(item.price)}
                    </strong>
                  </div>

                  <button
                    className="remove-btn"
                    onClick={() =>
                      removeFromCart(item.id)
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}

              <div className="cart-total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>

              <button
                className="publish-button"
                onClick={placeOrder}
                disabled={checkingOut}
              >
                {checkingOut
                  ? "Placing Order..."
                  : "Place Order →"}
              </button>

              <p className="checkout-note">
                Test order only. No real payment
                will be collected.
              </p>
            </>
          )}
        </div>
      </section>

      {/* BUYER ORDER HISTORY */}
      <section className="cart-section" id="orders">
        <div className="section-heading">
          <span className="section-eyebrow">
            ✦ YOUR ART JOURNEY ✦
          </span>

          <h2>My Order History</h2>

          <p>
            Your collected masterpieces,
            all in one place.
          </p>
        </div>

        <div className="cart-box">
          <button
            className="publish-button"
            onClick={loadOrders}
            disabled={loadingOrders}
          >
            {loadingOrders
              ? "Loading Orders..."
              : "Refresh My Orders ↻"}
          </button>

          {orderError && (
            <p className="status-text" role="alert">
              Could not load orders: {orderError}
            </p>
          )}

          {!loadingOrders &&
            !orderError &&
            orders.length === 0 && (
              <p className="empty-cart">
                No orders found for this account. 🌻
              </p>
            )}

          {orders.map((order) => (
            <div
              className="cart-item"
              key={order.id}
            >
              <div className="cart-item-info">
                <h3>
                  Order #{order.id.slice(0, 8)}
                </h3>

                <p>
                  {new Date(
                    order.created_at
                  ).toLocaleDateString("en-IN")}
                </p>

                <p>Status: {order.status}</p>
                <p>
                  Payment: {order.payment_status}
                </p>
              </div>

              <strong>
                {formatPrice(order.total_amount)}
              </strong>
            </div>
          ))}
        </div>
      </section>

      {/* TOAST */}
      {message && (
        <div
          className="toast-message"
          role="status"
        >
          <span>{message}</span>

          <button
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <h3>ARTPRENEUR 🌻</h3>
        <p>Where imagination meets opportunity.</p>
        <span>
          Made with 💛 for creative minds.
        </span>
      </footer>
    </div>
  );
}

export default App;
