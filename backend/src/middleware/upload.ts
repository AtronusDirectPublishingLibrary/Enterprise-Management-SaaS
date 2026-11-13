import multer from "multer";
import path from "path";
import fs from "fs";

const uploadRoot = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

function diskStorage(subdirectory?: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = subdirectory ? path.join(uploadRoot, subdirectory) : uploadRoot;
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  });
}

const storage = diskStorage();
const documentStorage = diskStorage("documents");
const newsImageStorage = diskStorage("news");

const documentFilter = (_req: any, file: any, cb: any) => {
  const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Invalid file type"));
};

const imageFilter = (_req: any, file: any, cb: any) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Use a JPG, PNG, WebP, GIF or AVIF image"));
};

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: documentFilter,
});

/** Internal archive documents are stored outside the public static roots. */
export const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: documentFilter,
});

/** News and other editorial images. */
export const uploadImage = multer({
  storage: newsImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
});