import formidable from "formidable";

export function parseForm(req) {
  const form = formidable({ multiples: true, maxFileSize: 500 * 1024 * 1024 });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export function toArray(f) {
  if (!f) return [];
  return Array.isArray(f) ? f : [f];
}
