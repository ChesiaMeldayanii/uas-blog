const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
const { auth, db } = require("./firebaseConfig");
const {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require("firebase/auth");
const { ref, set, get, remove } = require("firebase/database");
const { createClient } = require("@supabase/supabase-js");
const { error } = require("console");

dotenv.config();
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

// Middleware for auth protection
const checkAuth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");
  next();
};

// Main page
app.get("/", (req, res) => res.render("index"));

// **Register**
app.get("/register", (req, res) => res.render("register"));
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    res.redirect("/login");
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

// **Login**
app.get("/login", (req, res) => res.render("login"));
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const token = await userCredential.user.getIdToken();
    res.cookie("token", token);
    res.redirect("/dashboard");
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

// **Dashboard**
app.get("/dashboard", checkAuth, async (req, res) => {
  try {
    const blogsRef = ref(db, "blogs");
    const snapshot = await get(blogsRef);

    let blogs = [];
    if (snapshot.exists()) {
      const blogsData = snapshot.val();
      blogs = Object.keys(blogsData).map((key) => ({
        id: key,
        ...blogsData[key],
      }));
    }
    res.render("dashboard", { blogs });
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

// **Upload Blog**
const SUPABASE_URL = "https://lklawpktzqcugbhadnty.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrbGF3cGt0enFjdWdiaGFkbnR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxODg0MTQsImV4cCI6MjA1MTc2NDQxNH0.-uAdruq2iyO1Bfg5uh-o3DN6c3qcOUzVUB_gpimFKwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
app.get("/upload", checkAuth, (req, res) => res.render("uploadBlog"));
app.post("/upload", checkAuth, upload.single("file"), async (req, res) => {
  const { title, content } = req.body;

  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send("Cover image is required.");
    }

    const uniqueFilename = `${Date.now()}_${file.originalname}`;
    const buffer = file.buffer;

    const { data, error } = await supabase.storage
      .from("img-uas-blog")
      .upload(uniqueFilename, buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      return res.status(500).send({ error: error.message });
    }

    const coverImagePath = `${SUPABASE_URL}/storage/v1/object/public/${data.fullPath}`;

    const newBlogRef = ref(db, "blogs/" + Date.now());
    await set(newBlogRef, {
      title,
      content,
      coverImagePath,
    });

    res.redirect("/dashboard");
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

// **Edit & Update Blog**
app.get("/edit-blog/:blogId", checkAuth, async (req, res) => {
  const { blogId } = req.params;

  try {
    const blogRef = ref(db, `blogs/${blogId}`);
    const blogSnapshot = await get(blogRef);

    if (!blogSnapshot.exists()) {
      return res.status(404).send("Blog not found.");
    }

    const blogData = blogSnapshot.val();

    res.render("editBlog", { blogId, blogData });
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

app.post(
  "/update-blog/:blogId",
  checkAuth,
  upload.single("file"),
  async (req, res) => {
    const { blogId } = req.params;
    const { title, content } = req.body;

    try {
      const blogRef = ref(db, `blogs/${blogId}`);
      const blogSnapshot = await get(blogRef);

      if (!blogSnapshot.exists()) {
        return res.status(404).send("Blog not found.");
      }

      const blogData = blogSnapshot.val();

      let coverImagePath = blogData.coverImagePath;

      if (req.file) {
        const oldFilePath = blogData.coverImagePath.split("/").pop();
        console.log(oldFilePath);
        await supabase.storage.from("img-uas-blog").remove([oldFilePath]);

        const uniqueFilename = `${Date.now()}_${req.file.originalname}`;
        const buffer = req.file.buffer;

        const { data, error } = await supabase.storage
          .from("img-uas-blog")
          .upload(uniqueFilename, buffer, {
            contentType: req.file.mimetype,
          });

        if (error) {
          return res.status(500).send({ error: error.message });
        }

        coverImagePath = `${SUPABASE_URL}/storage/v1/object/public/${data.fullPath}`;
      }

      await set(blogRef, {
        title,
        content,
        coverImagePath,
      });

      res.redirect("/dashboard");
    } catch (error) {
      res.status(500).send("Error: " + error.message);
    }
  }
);

// **Delete Blog**
app.post("/delete-blog/:blogId", checkAuth, async (req, res) => {
  const { blogId } = req.params;

  try {
    console.log(blogId);
    const blogRef = ref(db, `blogs/${blogId}`);
    const snapshot = await get(blogRef);

    if (!snapshot.exists()) {
      return res.status(404).send({ error: "Blog not found" });
    }

    const blogData = snapshot.val();
    const coverImagePath = blogData.coverImagePath.split(
      "/storage/v1/object/public/img-uas-blog/"
    )[1];

    await remove(blogRef);

    const { error } = await supabase.storage
      .from("img-uas-blog")
      .remove([coverImagePath]);

    if (error) {
      return res
        .status(500)
        .send({ error: `Failed to delete file: ${error.message}` });
    }

    res.redirect("/dashboard");
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

// **Read Blog**
app.get("/read-blog/:blogId", async (req, res) => {
  const { blogId } = req.params;

  try {
    const blogRef = ref(db, `blogs/${blogId}`);
    const blogSnapshot = await get(blogRef);

    if (!blogSnapshot.exists()) {
      return res.status(404).send("Blog not found.");
    }

    const blogData = blogSnapshot.val();

    const blogsRef = ref(db, "blogs");
    const snapshot = await get(blogsRef);
    let blogs = [];
    if (snapshot.exists()) {
      const blogsData = snapshot.val();
      blogs = Object.keys(blogsData)
        .map((key) => {
          if (key === blogId) {
            return null;
          }
          return {
            id: key,
            ...blogsData[key],
          };
        })
        .filter((blog) => blog !== null);
    }

    res.render("readBlog", { blogData, blogs });
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

// **Logout**
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
