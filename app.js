const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const multer = require("multer"); // Untuk menangani file upload
const path = require("path"); // Untuk menangani path dan ekstensi file
const { auth, db } = require("./firebaseConfig"); // Hanya menggunakan Realtime Database
const {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require("firebase/auth"); // Modular Auth Firebase
const { ref, set, get } = require("firebase/database"); // Realtime Database functions

dotenv.config();
const app = express();

// Set up multer for file upload, memastikan file yang diupload berupa gambar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/"); // Folder untuk menyimpan file sementara
  },
  filename: (req, file, cb) => {
    // Mengambil ekstensi file yang diupload
    const ext = path.extname(file.originalname).toLowerCase();

    // Mengecek apakah ekstensi yang diupload adalah jpg, jpeg, atau png
    if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
      cb(null, Date.now() + ext); // Menyimpan file dengan nama unik (timestamp) dan ekstensi asli
    } else {
      cb(new Error("Only image files are allowed!"), false); // Menolak upload jika bukan gambar
    }
  },
});

const upload = multer({ storage }); // Menetapkan konfigurasi penyimpanan

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
    ); // Register user
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
    ); // Login user
    const token = await userCredential.user.getIdToken();
    res.cookie("token", token); // Save token in cookie
    res.redirect("/dashboard");
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

// **Dashboard**
app.get("/dashboard", checkAuth, async (req, res) => {
  try {
    const blogsRef = ref(db, "blogs"); // Reference to 'blogs' node
    const snapshot = await get(blogsRef); // Get data from 'blogs'

    let blogs = [];
    if (snapshot.exists()) {
      const blogsData = snapshot.val();
      blogs = Object.keys(blogsData).map((key) => ({
        id: key,
        ...blogsData[key],
      }));
    }

    res.render("dashboard", { blogs }); // Send data to template
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

// **Upload Blog**
app.get("/upload", checkAuth, (req, res) => res.render("uploadBlog"));
app.post("/upload", checkAuth, upload.single("cover"), async (req, res) => {
  const { title, content } = req.body;
  const coverImage = req.file; // Gambar sampul yang diupload

  if (!coverImage) {
    return res.status(400).send("Cover image is required.");
  }

  try {
    // Path file gambar di server lokal (simpan di folder uploads)
    const coverImagePath = "/uploads/" + coverImage.filename;

    // Menyimpan data blog beserta path gambar ke Firebase Realtime Database
    const blogsRef = ref(db, "blogs");
    const newBlogRef = ref(db, "blogs/" + Date.now()); // Menggunakan timestamp untuk ID unik
    await set(newBlogRef, {
      title,
      content,
      coverImagePath, // Simpan path file gambar
    });

    res.redirect("/dashboard");
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});

// **Logout**
app.get("/logout", (req, res) => {
  res.clearCookie("token"); // Clear token cookie
  res.redirect("/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
