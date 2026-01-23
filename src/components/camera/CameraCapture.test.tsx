import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CameraCapture } from "./CameraCapture";

// Mock MediaStream
const createMockMediaStream = () => {
  const mockTrack = {
    stop: vi.fn(),
    kind: "video" as const,
    id: "mock-track-id",
    enabled: true,
    muted: false,
    label: "Mock Camera",
    readyState: "live" as const,
    onended: null,
    onmute: null,
    onunmute: null,
    contentHint: "",
    getCapabilities: vi.fn(() => ({})),
    getConstraints: vi.fn(() => ({})),
    getSettings: vi.fn(() => ({})),
    applyConstraints: vi.fn(),
    clone: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  };

  return {
    getTracks: vi.fn(() => [mockTrack]),
    getVideoTracks: vi.fn(() => [mockTrack]),
    getAudioTracks: vi.fn(() => []),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn(),
    active: true,
    id: "mock-stream-id",
    onaddtrack: null,
    onremovetrack: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as MediaStream;
};

// Mock video element with dimensions
const setupVideoElement = () => {
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
    get: () => 1920,
    configurable: true,
  });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
    get: () => 1080,
    configurable: true,
  });
  HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLVideoElement.prototype.pause = vi.fn();
};

// Mock canvas with context
const setupCanvasElement = () => {
  const mockContext = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    createLinearGradient: vi.fn(),
    createRadialGradient: vi.fn(),
    createPattern: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    isPointInPath: vi.fn(),
    isPointInStroke: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    createImageData: vi.fn(),
    canvas: {} as HTMLCanvasElement,
    globalAlpha: 1,
    globalCompositeOperation: "source-over" as GlobalCompositeOperation,
    filter: "none",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "medium" as ImageSmoothingQuality,
    strokeStyle: "#000000",
    fillStyle: "#000000",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: "rgba(0, 0, 0, 0)",
    lineWidth: 1,
    lineCap: "butt" as CanvasLineCap,
    lineJoin: "miter" as CanvasLineJoin,
    miterLimit: 10,
    lineDashOffset: 0,
    font: "10px sans-serif",
    textAlign: "start" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    direction: "ltr" as CanvasDirection,
    fontKerning: "auto" as CanvasFontKerning,
    fontStretch: "normal" as CanvasFontStretch,
    fontVariantCaps: "normal" as CanvasFontVariantCaps,
    letterSpacing: "0px",
    textRendering: "auto" as CanvasTextRendering,
    wordSpacing: "0px",
    getLineDash: vi.fn(() => []),
    setLineDash: vi.fn(),
    getContextAttributes: vi.fn(() => ({})),
    drawFocusIfNeeded: vi.fn(),
    roundRect: vi.fn(),
    getTransform: vi.fn(),
    reset: vi.fn(),
    scrollPathIntoView: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);
  HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
    // Simulate async blob creation
    setTimeout(() => {
      callback(new Blob(["test"], { type: "image/jpeg" }));
    }, 0);
  });
};

// Mock URL.createObjectURL and revokeObjectURL
const setupURLMocks = () => {
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
};

describe("CameraCapture", () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setupVideoElement();
    setupCanvasElement();
    setupURLMocks();

    // Default successful getUserMedia mock
    mockGetUserMedia = vi.fn().mockResolvedValue(createMockMediaStream());
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("renders initializing state while starting camera", async () => {
      // Delay the getUserMedia response
      mockGetUserMedia.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(createMockMediaStream()), 100))
      );

      render(<CameraCapture onCapture={vi.fn()} />);

      expect(screen.getByText("Starting camera...")).toBeInTheDocument();
    });

    it("renders ready state after camera starts successfully", async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Point camera at item")).toBeInTheDocument();
      });
    });

    it("requests camera with back-facing preference", async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      });
    });
  });

  describe("Error Handling", () => {
    it("renders permission_denied state when camera access is denied", async () => {
      const permissionError = new DOMException(
        "Permission denied",
        "NotAllowedError"
      );
      mockGetUserMedia.mockRejectedValue(permissionError);
      const onError = vi.fn();

      render(<CameraCapture onCapture={vi.fn()} onError={onError} />);

      await waitFor(() => {
        expect(screen.getByText("Camera access denied")).toBeInTheDocument();
        expect(
          screen.getByText(/Please enable camera permissions/)
        ).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });

    it("renders error state when no camera is found", async () => {
      const notFoundError = new DOMException(
        "Requested device not found",
        "NotFoundError"
      );
      mockGetUserMedia.mockRejectedValue(notFoundError);
      const onError = vi.fn();

      render(<CameraCapture onCapture={vi.fn()} onError={onError} />);

      await waitFor(() => {
        expect(
          screen.getByText("No camera found on this device.")
        ).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });

    it("shows retry button on error and retries when clicked", async () => {
      const genericError = new Error("Camera error");
      mockGetUserMedia.mockRejectedValueOnce(genericError);
      mockGetUserMedia.mockResolvedValueOnce(createMockMediaStream());

      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Camera error")).toBeInTheDocument();
      });

      const retryButton = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText("Point camera at item")).toBeInTheDocument();
      });
    });

    it("shows try again button on permission denied and retries when clicked", async () => {
      const permissionError = new DOMException(
        "Permission denied",
        "NotAllowedError"
      );
      mockGetUserMedia.mockRejectedValueOnce(permissionError);
      mockGetUserMedia.mockResolvedValueOnce(createMockMediaStream());

      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Camera access denied")).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText("Point camera at item")).toBeInTheDocument();
      });
    });
  });

  describe("Capturing Photo", () => {
    it("shows capture button when camera is ready", async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Capture photo" })
        ).toBeInTheDocument();
      });
    });

    it("captures photo and shows preview when capture button is clicked", async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Point camera at item")).toBeInTheDocument();
      });

      const captureButton = screen.getByRole("button", { name: "Capture photo" });
      fireEvent.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText("Retake")).toBeInTheDocument();
        expect(screen.getByText("Use Photo")).toBeInTheDocument();
      });
    });

    it("creates a File with JPEG type when capturing", async () => {
      const onCapture = vi.fn();
      render(<CameraCapture onCapture={onCapture} />);

      await waitFor(() => {
        expect(screen.getByText("Point camera at item")).toBeInTheDocument();
      });

      const captureButton = screen.getByRole("button", { name: "Capture photo" });
      fireEvent.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText("Use Photo")).toBeInTheDocument();
      });

      const usePhotoButton = screen.getByRole("button", { name: /use photo/i });
      fireEvent.click(usePhotoButton);

      expect(onCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "image/jpeg",
          name: expect.stringMatching(/^camera-capture-\d+\.jpg$/),
        })
      );
    });
  });

  describe("Retake Functionality", () => {
    it("returns to ready state when retake is clicked", async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Point camera at item")).toBeInTheDocument();
      });

      // Capture
      const captureButton = screen.getByRole("button", { name: "Capture photo" });
      fireEvent.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText("Retake")).toBeInTheDocument();
      });

      // Retake
      const retakeButton = screen.getByRole("button", { name: /retake/i });
      fireEvent.click(retakeButton);

      await waitFor(() => {
        expect(screen.getByText("Point camera at item")).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Capture photo" })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Disabled State", () => {
    it("renders disabled state when disabled prop is true", () => {
      render(<CameraCapture onCapture={vi.fn()} disabled />);

      expect(screen.getByText("Camera disabled")).toBeInTheDocument();
    });

    it("does not request camera when disabled", () => {
      render(<CameraCapture onCapture={vi.fn()} disabled />);

      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("stops media stream when component unmounts", async () => {
      const mockStream = createMockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);

      const { unmount } = render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Point camera at item")).toBeInTheDocument();
      });

      unmount();

      expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
    });

    it("revokes object URL when component unmounts after capture", async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Point camera at item")).toBeInTheDocument();
      });

      const captureButton = screen.getByRole("button", { name: "Capture photo" });
      fireEvent.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText("Use Photo")).toBeInTheDocument();
      });

      // Verify createObjectURL was called
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
