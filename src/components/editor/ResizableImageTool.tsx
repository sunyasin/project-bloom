import { API, BlockTool, BlockToolData, ToolConfig } from "@editorjs/editorjs";

export interface ResizableImageData extends BlockToolData {
  file: {
    url: string;
  };
  caption?: string;
  withBorder?: boolean;
  withBackground?: boolean;
  stretched?: boolean;
  width?: number;
}

interface ImageToolConfig extends ToolConfig {
  uploader?: {
    uploadByFile?: (file: File) => Promise<{ success: number; file?: { url: string } }>;
    uploadByUrl?: (url: string) => Promise<{ success: number; file?: { url: string } }>;
  };
}

export class ResizableImage implements BlockTool {
  private api: API;
  private data: ResizableImageData;
  private config: ImageToolConfig;
  private wrapper: HTMLDivElement | null = null;
  private imageElement: HTMLImageElement | null = null;
  private captionInput: HTMLInputElement | null = null;

  private isResizing = false;
  private startX = 0;
  private startWidth = 0;

  static get toolbox() {
    return {
      title: "Изображение",
      icon: '<svg width="17" height="15" viewBox="0 0 336 276" xmlns="http://www.w3.org/2000/svg"><path d="M291 150V79c0-19-15-34-34-34H79c-19 0-34 15-34 34v42l67-44 81 72 56-29 42 30zm0 52l-43-30-56 30-81-67-66 39v23c0 19 15 34 34 34h178c17 0 31-13 34-29zM79 0h178c44 0 79 35 79 79v118c0 44-35 79-79 79H79c-44 0-79-35-79-79V79C0 35 35 0 79 0z"/></svg>',
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  constructor({
    data,
    api,
    config,
  }: {
    data: ResizableImageData;
    api: API;
    config: ImageToolConfig;
  }) {
    this.api = api;
    this.config = config;
    this.data = {
      file: data.file || { url: "" },
      caption: data.caption || "",
      withBorder: data.withBorder ?? false,
      withBackground: data.withBackground ?? false,
      stretched: data.stretched ?? false,
      width: data.width,
    };
  }

  render(): HTMLElement {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("image-tool");
    this.wrapper.style.cssText = "position: relative; margin: 10px 0;";

    if (this.data.file?.url) {
      this.showImage(this.data.file.url);
    } else {
      this.showUploader();
    }

    return this.wrapper;
  }

  private showUploader() {
    if (!this.wrapper) return;

    const uploadArea = document.createElement("div");
    uploadArea.style.cssText = `
      border: 2px dashed hsl(var(--muted-foreground) / 0.3);
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    `;

    uploadArea.innerHTML = `
      <div style="color: hsl(var(--muted-foreground)); margin-bottom: 8px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto;">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21,15 16,10 5,21"></polyline>
        </svg>
      </div>
      <p style="color: hsl(var(--muted-foreground)); font-size: 14px; margin: 0;">
        Нажмите для загрузки или вставьте URL
      </p>
    `;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    fileInput.addEventListener("change", async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file && this.config.uploader?.uploadByFile) {
        const result = await this.config.uploader.uploadByFile(file);
        if (result.success && result.file?.url) {
          this.data.file = { url: result.file.url };
          this.showImage(result.file.url);
        }
      }
    });

    uploadArea.addEventListener("click", () => fileInput.click());

    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "hsl(var(--primary))";
      uploadArea.style.background = "hsl(var(--primary) / 0.05)";
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.style.borderColor = "hsl(var(--muted-foreground) / 0.3)";
      uploadArea.style.background = "transparent";
    });

    uploadArea.addEventListener("drop", async (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "hsl(var(--muted-foreground) / 0.3)";
      uploadArea.style.background = "transparent";

      const file = e.dataTransfer?.files[0];
      if (file && file.type.startsWith("image/") && this.config.uploader?.uploadByFile) {
        const result = await this.config.uploader.uploadByFile(file);
        if (result.success && result.file?.url) {
          this.data.file = { url: result.file.url };
          this.showImage(result.file.url);
        }
      }
    });

    this.wrapper.appendChild(uploadArea);
    this.wrapper.appendChild(fileInput);
  }

  private showImage(url: string) {
    if (!this.wrapper) return;
    this.wrapper.innerHTML = "";

    // Image container
    const imageContainer = document.createElement("div");
    imageContainer.style.cssText = `
      position: relative;
      display: inline-block;
      max-width: 100%;
    `;

    // Image element
    this.imageElement = document.createElement("img");
    this.imageElement.src = url;
    this.imageElement.alt = this.data.caption || "";
    this.imageElement.style.cssText = `
      display: block;
      max-width: 100%;
      border-radius: 8px;
      cursor: pointer;
    `;

    // Apply saved width if exists
    if (this.data.width) {
      this.imageElement.style.width = `${this.data.width}px`;
    }

    // Resize handles
    const resizeHandleRight = this.createResizeHandle("right");
    const resizeHandleLeft = this.createResizeHandle("left");

    imageContainer.appendChild(this.imageElement);
    imageContainer.appendChild(resizeHandleRight);
    imageContainer.appendChild(resizeHandleLeft);

    // Caption input
    this.captionInput = document.createElement("input");
    this.captionInput.type = "text";
    this.captionInput.placeholder = "Подпись к изображению";
    this.captionInput.value = this.data.caption || "";
    this.captionInput.style.cssText = `
      display: block;
      width: 100%;
      margin-top: 8px;
      padding: 8px 12px;
      border: 1px solid hsl(var(--border));
      border-radius: 6px;
      font-size: 14px;
      color: hsl(var(--foreground));
      background: hsl(var(--background));
      outline: none;
    `;

    this.captionInput.addEventListener("input", (e) => {
      this.data.caption = (e.target as HTMLInputElement).value;
    });

    this.captionInput.addEventListener("focus", () => {
      this.captionInput!.style.borderColor = "hsl(var(--primary))";
    });

    this.captionInput.addEventListener("blur", () => {
      this.captionInput!.style.borderColor = "hsl(var(--border))";
    });

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3,6 5,6 21,6"></polyline>
        <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
      </svg>
    `;
    deleteBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      background: hsl(var(--destructive));
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 10;
    `;

    imageContainer.addEventListener("mouseenter", () => {
      deleteBtn.style.opacity = "1";
    });

    imageContainer.addEventListener("mouseleave", () => {
      if (!this.isResizing) {
        deleteBtn.style.opacity = "0";
      }
    });

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.data.file = { url: "" };
      this.data.width = undefined;
      this.showUploader();
    });

    imageContainer.appendChild(deleteBtn);

    this.wrapper.appendChild(imageContainer);
    this.wrapper.appendChild(this.captionInput);
  }

  private createResizeHandle(side: "left" | "right"): HTMLElement {
    const handle = document.createElement("div");
    handle.style.cssText = `
      position: absolute;
      top: 50%;
      ${side}: -6px;
      transform: translateY(-50%);
      width: 12px;
      height: 40px;
      background: hsl(var(--primary));
      border-radius: 4px;
      cursor: ew-resize;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 5;
    `;

    handle.addEventListener("mouseenter", () => {
      handle.style.opacity = "1";
    });

    // Show handles on image hover
    this.imageElement?.parentElement?.addEventListener("mouseenter", () => {
      handle.style.opacity = "0.7";
    });

    this.imageElement?.parentElement?.addEventListener("mouseleave", () => {
      if (!this.isResizing) {
        handle.style.opacity = "0";
      }
    });

    handle.addEventListener("mousedown", (e) => this.startResize(e, side));

    return handle;
  }

  private startResize(e: MouseEvent, side: "left" | "right") {
    e.preventDefault();
    e.stopPropagation();
    this.isResizing = true;
    this.startX = e.clientX;
    this.startWidth = this.imageElement?.offsetWidth || 300;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!this.imageElement) return;

      const deltaX = moveEvent.clientX - this.startX;
      const multiplier = side === "right" ? 1 : -1;
      const newWidth = Math.max(100, this.startWidth + deltaX * multiplier);

      this.imageElement.style.width = `${newWidth}px`;
      this.data.width = newWidth;
    };

    const handleMouseUp = () => {
      this.isResizing = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  save(): ResizableImageData {
    return {
      file: this.data.file,
      caption: this.captionInput?.value || this.data.caption || "",
      withBorder: this.data.withBorder,
      withBackground: this.data.withBackground,
      stretched: this.data.stretched,
      width: this.data.width,
    };
  }

  validate(savedData: ResizableImageData): boolean {
    return !!savedData.file?.url;
  }
}
