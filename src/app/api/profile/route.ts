import { readFile, readdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

async function findProfilePdf(directory: string): Promise<string | null> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nestedFile = await findProfilePdf(filePath);
      if (nestedFile) return nestedFile;
    } else if (/\.pdf$/i.test(entry.name)) {
      return filePath;
    }
  }

  return null;
}

export async function GET() {
  try {
    const pdfPath = await findProfilePdf(path.join(process.cwd(), "public"));
    if (!pdfPath) {
      return NextResponse.json({ message: "Intex profile PDF was not found." }, { status: 404 });
    }

    const pdf = await readFile(pdfPath);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${path.basename(pdfPath)}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ message: "Unable to open the Intex profile PDF." }, { status: 500 });
  }
}
