import {
    FaceLandmarker,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

// Khai báo các thành phần giao diện
const videoElement = document.getElementById('videoElement');
const arCanvas = document.getElementById('arCanvas');
const canvasElement = document.getElementById('canvasElement');
const captureAnalyzeBtn = document.getElementById('captureAnalyzeBtn');
const toggleCameraBtn = document.getElementById('toggleCameraBtn');
const cameraNotice = document.getElementById('cameraNotice');
const cameraGuide = document.getElementById('cameraGuide');
const faceGuideOval = document.getElementById('faceGuideOval');
const guideText = document.getElementById('guideText');
const cameraScanner = document.getElementById('cameraScanner');
const uploadScanner = document.getElementById('uploadScanner');
const cameraScanningStatus = document.getElementById('cameraScanningStatus');
const cameraScanningText = document.getElementById('cameraScanningText');
const uploadScanningStatus = document.getElementById('uploadScanningStatus');
const uploadScanningText = document.getElementById('uploadScanningText');

// Các thành phần tạo và tải thẻ kết quả Story 9:16
const downloadStoryBtn = document.getElementById('downloadStoryBtn');
const downloadStoryBtnBottom = document.getElementById('downloadStoryBtnBottom');
const storyCard = document.getElementById('storyCard');
const storyCardContainer = document.getElementById('storyCardContainer');
const storyPortraitImg = document.getElementById('storyPortraitImg');
const storyVibeBadgeVal = document.getElementById('storyVibeBadgeVal');
const storyScoreBig = document.getElementById('storyScoreBig');
const storyScoreFill = document.getElementById('storyScoreFill');
const storyShapeName = document.getElementById('storyShapeName');
const storyEyeShape = document.getElementById('storyEyeShape');
const storyColorDesc = document.getElementById('storyColorDesc');
const storySwatchesRow = document.getElementById('storySwatchesRow');
const storyVerticalText = document.getElementById('storyVerticalText');
const storySymmetryText = document.getElementById('storySymmetryText');

let lastAnalyzedImageBase64 = null;
let lastAnalyzedData = null;
let lastAnalyzedMetrics = null;

// Các thành phần ngăn kéo lịch sử phân tích và so sánh diện mạo
const openHistoryBtn = document.getElementById('openHistoryBtn');
const historyOverlay = document.getElementById('historyOverlay');
const historyDrawer = document.getElementById('historyDrawer');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const triggerCompareBtn = document.getElementById('triggerCompareBtn');
const historyCountBadge = document.getElementById('historyCountBadge');
const compareCounterBadge = document.getElementById('compareCounterBadge');
const historyListContainer = document.getElementById('historyListContainer');

// Các thành phần hộp thoại so sánh
const compareModalOverlay = document.getElementById('compareModalOverlay');
const compareModal = document.getElementById('compareModal');
const closeCompareModalBtn = document.getElementById('closeCompareModalBtn');
const compareModalBody = document.getElementById('compareModalBody');

const STORAGE_HISTORY_KEY = 'face_analyzer_history_v1';
let selectedScansForCompare = [];

// Thành phần hiển thị bộ đếm số lượt phân tích trong tuần
const weeklyFaceCount = document.getElementById('weeklyFaceCount');
const BASE_WEEKLY_COUNT = 1248;
const STORAGE_WEEKLY_COUNT_KEY = 'face_analyzer_weekly_count';

// Các thành phần đèn báo trạng thái trực quan HUD
const hudLightingDot = document.getElementById('hudLightingDot');
const hudLightingVal = document.getElementById('hudLightingVal');
const hudAngleDot = document.getElementById('hudAngleDot');
const hudAngleVal = document.getElementById('hudAngleVal');
const hudDistanceDot = document.getElementById('hudDistanceDot');
const hudDistanceVal = document.getElementById('hudDistanceVal');

const cameraTabBtn = document.getElementById('cameraTabBtn');
const uploadTabBtn = document.getElementById('uploadTabBtn');
const cameraSection = document.getElementById('cameraSection');
const uploadSection = document.getElementById('uploadSection');

const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const removeBtn = document.getElementById('removeBtn');
const analyzeUploadBtn = document.getElementById('analyzeUploadBtn');
const dropZone = document.getElementById('dropZone');
const dropContent = document.getElementById('dropContent');
const previewWrapper = document.getElementById('previewWrapper');
const imagePreview = document.getElementById('imagePreview');

const resultSection = document.getElementById('resultSection');
const spinnerWrapper = document.getElementById('spinnerWrapper');
const resultBody = document.getElementById('resultBody');
const warningBox = document.getElementById('warningBox');

// Các thành phần bảng thông số hình học
const metricsContainer = document.getElementById('metricsContainer');
const verticalRatioValue = document.getElementById('verticalRatioValue');
const foreheadBar = document.getElementById('foreheadBar');
const foreheadPercent = document.getElementById('foreheadPercent');
const noseBar = document.getElementById('noseBar');
const nosePercent = document.getElementById('nosePercent');
const chinBar = document.getElementById('chinBar');
const chinPercent = document.getElementById('chinPercent');
const horizontalRatioValue = document.getElementById('horizontalRatioValue');
const eyeWidthBar = document.getElementById('eyeWidthBar');
const symmetryValue = document.getElementById('symmetryValue');
const symmetryBar = document.getElementById('symmetryBar');

let mediaStream = null;
let currentFileBase64 = null;
let currentMimeType = 'image/jpeg';
let faceLandmarker = null;
let drawingUtils = null;

// Biến điều khiển vòng lặp AR thời gian thực
let arAnimationId = null;
let isARActive = false;
let lastVideoTime = -1;
let frameCounter = 0;
let cachedLuminanceStatus = { level: 'good', text: 'Tốt' };

// Khởi tạo công cụ nhận diện điểm mốc khuôn mặt MediaPipe với chế độ VIDEO theo thời gian thực
async function initFaceLandmarker() {
    try {
        cameraNotice.textContent = 'Đang tải bộ mô hình nhận diện điểm mốc AR...';
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        try {
            faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU"
                },
                outputFaceBlendshapes: false,
                runningMode: "VIDEO",
                numFaces: 1
            });
        } catch (gpuError) {
            faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "CPU"
                },
                outputFaceBlendshapes: false,
                runningMode: "VIDEO",
                numFaces: 1
            });
        }

        const arCtx = arCanvas.getContext('2d');
        drawingUtils = new DrawingUtils(arCtx);

        cameraNotice.textContent = 'Hệ thống AR đã sẵn sàng. Hãy căn chỉnh khuôn mặt vào giữa khung hình.';
        captureAnalyzeBtn.disabled = false;

        // Nếu camera đã bật, bắt đầu luồng vẽ AR ngay
        if (mediaStream && !isARActive) {
            startLiveARLoop();
        }
    } catch (err) {
        cameraNotice.textContent = 'Không thể nạp mô hình nhận diện điểm mốc. Vui lòng tải lại trang hoặc kiểm tra kết nối mạng.';
    }
}

// Cập nhật đèn trạng thái HUD và khung hình Oval
function updateHudLighting(level, text) {
    if (hudLightingDot) hudLightingDot.className = 'hud-dot ' + level;
    if (hudLightingVal) hudLightingVal.textContent = text;
}

function updateHudAngle(level, text) {
    if (hudAngleDot) hudAngleDot.className = 'hud-dot ' + level;
    if (hudAngleVal) hudAngleVal.textContent = text;
}

function updateHudDistance(level, text) {
    if (hudDistanceDot) hudDistanceDot.className = 'hud-dot ' + level;
    if (hudDistanceVal) hudDistanceVal.textContent = text;
}

function setOvalMatched(matched, text) {
    if (!faceGuideOval) return;
    if (matched) {
        faceGuideOval.classList.add('matched');
    } else {
        faceGuideOval.classList.remove('matched');
    }
    if (guideText && text) {
        guideText.textContent = text;
    }
}

// Đánh giá và cập nhật trạng thái khuôn mặt thời gian thực
function evaluateRealtimeFace(landmarks, width, height) {
    const noseTip = landmarks[1];
    const subnasale = landmarks[2];
    const eyeLeftInner = landmarks[362];
    const eyeRightInner = landmarks[133];
    const jawRight = landmarks[234];
    const jawLeft = landmarks[454];

    // 1. Tính toán độ nghiêng góc mặt (Yaw)
    const midEyeX = (eyeLeftInner.x + eyeRightInner.x) / 2;
    const eyeDist = Math.abs(eyeLeftInner.x - eyeRightInner.x);
    const yawOffset = Math.abs(noseTip.x - midEyeX);
    const yawRatio = eyeDist > 0 ? (yawOffset / eyeDist) : 0;

    let isAngleGood = false;
    if (yawRatio < 0.16) {
        updateHudAngle('good', 'Chính diện');
        isAngleGood = true;
    } else {
        updateHudAngle('warning', 'Hơi nghiêng');
        isAngleGood = false;
    }

    // 2. Tính toán khoảng cách (Face Scale)
    const faceWidthNorm = Math.abs(jawLeft.x - jawRight.x);
    let isDistanceGood = false;

    if (faceWidthNorm < 0.22) {
        updateHudDistance('warning', 'Quá xa');
        setOvalMatched(false, 'Tiến lại gần hơn');
    } else if (faceWidthNorm > 0.60) {
        updateHudDistance('warning', 'Quá gần');
        setOvalMatched(false, 'Lùi ra xa một chút');
    } else {
        updateHudDistance('good', 'Chuẩn xác');
        isDistanceGood = true;
        if (isAngleGood) {
            setOvalMatched(true, 'Khung hình hoàn hảo');
        } else {
            setOvalMatched(false, 'Giữ thẳng mặt');
        }
    }
}

function resetRealtimeStatus() {
    updateHudAngle('warning', 'Chưa có mặt');
    updateHudDistance('warning', 'Đang chờ mặt');
    setOvalMatched(false, 'Đưa khuôn mặt vào khung hình');
}

// Vòng lặp vẽ lưới AR và điểm mốc theo thời gian thực (60 FPS)
function startLiveARLoop() {
    isARActive = true;

    function renderARFrame() {
        if (!isARActive || !mediaStream) return;

        if (videoElement && videoElement.readyState >= 2) {
            if (videoElement.currentTime !== lastVideoTime) {
                lastVideoTime = videoElement.currentTime;
                frameCounter++;

                const width = videoElement.videoWidth || 640;
                const height = videoElement.videoHeight || 480;

                if (arCanvas.width !== width || arCanvas.height !== height) {
                    arCanvas.width = width;
                    arCanvas.height = height;
                }

                const arCtx = arCanvas.getContext('2d');
                arCtx.clearRect(0, 0, width, height);

                // Đo độ sáng định kỳ mỗi 20 khung hình để duy trì hiệu năng mượt mà
                if (frameCounter % 20 === 0) {
                    const lum = checkImageLuminance(videoElement);
                    if (lum < 38) {
                        cachedLuminanceStatus = { level: 'danger', text: 'Thiếu sáng' };
                    } else if (lum > 240) {
                        cachedLuminanceStatus = { level: 'warning', text: 'Quá chói' };
                    } else {
                        cachedLuminanceStatus = { level: 'good', text: 'Tốt' };
                    }
                    updateHudLighting(cachedLuminanceStatus.level, cachedLuminanceStatus.text);
                }

                // Nhận diện điểm mốc video thời gian thực với MediaPipe
                if (faceLandmarker) {
                    try {
                        const results = faceLandmarker.detectForVideo(videoElement, performance.now());
                        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
                            const landmarks = results.faceLandmarks[0];

                            if (drawingUtils) {
                                // 1. Vẽ các đường viền ngũ quan (mắt, mũi, môi, hàm) màu Neon Cyan
                                drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_CONTOURS, {
                                    color: 'rgba(0, 242, 254, 0.42)',
                                    lineWidth: 1.2
                                });

                                // 2. Vẽ lưới AR liên kết siêu mảnh màu Neon Tím
                                drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
                                    color: 'rgba(168, 85, 247, 0.12)',
                                    lineWidth: 0.6
                                });

                                // 3. Vẽ các điểm mốc ngũ quan phát sáng Neon
                                const keyIndices = [1, 2, 10, 33, 61, 133, 152, 168, 234, 263, 291, 362, 454];
                                arCtx.save();
                                arCtx.fillStyle = '#00f2fe';
                                arCtx.shadowColor = '#00f2fe';
                                arCtx.shadowBlur = 6;
                                keyIndices.forEach(idx => {
                                    const pt = landmarks[idx];
                                    if (pt) {
                                        arCtx.beginPath();
                                        arCtx.arc(pt.x * width, pt.y * height, 2.2, 0, 2 * Math.PI);
                                        arCtx.fill();
                                    }
                                });
                                arCtx.restore();
                            }

                            evaluateRealtimeFace(landmarks, width, height);
                        } else {
                            resetRealtimeStatus();
                        }
                    } catch (e) {
                        // Bỏ qua lỗi khung hình tạm thời nếu có
                    }
                }
            }
        }

        arAnimationId = requestAnimationFrame(renderARFrame);
    }

    arAnimationId = requestAnimationFrame(renderARFrame);
}

function stopLiveARLoop() {
    isARActive = false;
    if (arAnimationId) {
        cancelAnimationFrame(arAnimationId);
        arAnimationId = null;
    }
    if (arCanvas && arCanvas.width && arCanvas.height) {
        const arCtx = arCanvas.getContext('2d');
        arCtx.clearRect(0, 0, arCanvas.width, arCanvas.height);
    }
}

// Xóa sạch trạng thái cũ khi khởi động lại camera hoặc đổi chế độ
function resetAllStates() {
    resultSection.style.display = 'none';
    resultBody.innerHTML = '';
    metricsContainer.style.display = 'none';
    warningBox.style.display = 'none';
    warningBox.innerHTML = '';

    // Dừng toàn bộ hiệu ứng quét và chuỗi thông báo
    stopScanningSequence();

    // Xóa nội dung khung hình tĩnh cũ trên canvas
    if (canvasElement.width && canvasElement.height) {
        const ctx = canvasElement.getContext('2d');
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
    canvasElement.style.display = 'none';

    // Hiện lại khung camera động và khung căn chỉnh
    videoElement.style.display = 'block';
    cameraGuide.style.display = 'flex';
    if (cameraHudStatus) {
        cameraHudStatus.style.display = 'flex';
    }
    faceGuideOval.classList.remove('matched');
    guideText.textContent = 'Đưa khuôn mặt vào khung hình';

    captureAnalyzeBtn.disabled = false;
    currentFileBase64 = null;
    resetRealtimeStatus();
}

// Khởi tạo luồng ghi hình từ webcam kèm xử lý ngoại lệ
async function startCamera() {
    stopCamera();
    cameraNotice.textContent = 'Đang kết nối đến camera...';
    try {
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        };

        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = mediaStream;
        await videoElement.play();

        canvasElement.style.display = 'none';
        videoElement.style.display = 'block';
        cameraGuide.style.display = 'flex';
        cameraNotice.textContent = 'Camera đã sẵn sàng. Hãy căn chỉnh khuôn mặt vào giữa khung hình.';

        if (faceLandmarker) {
            captureAnalyzeBtn.disabled = false;
            startLiveARLoop();
        }
    } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            cameraNotice.textContent = 'Trình duyệt đã bị từ chối quyền truy cập máy ảnh. Vui lòng bấm vào biểu tượng ổ khóa trên thanh địa chỉ để cấp quyền, hoặc chuyển sang chế độ tải ảnh từ máy.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            cameraNotice.textContent = 'Không tìm thấy thiết bị máy ảnh kết nối với máy tính. Vui lòng kiểm tra lại thiết bị hoặc chuyển sang chế độ tải ảnh.';
        } else {
            cameraNotice.textContent = 'Không thể khởi động thiết bị máy ảnh. Vui lòng thử lại hoặc chọn chế độ tải ảnh từ máy.';
        }
        captureAnalyzeBtn.disabled = true;
    }
}

// Ngắt luồng ghi hình
function stopCamera() {
    stopLiveARLoop();
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    if (videoElement.srcObject) {
        videoElement.srcObject = null;
    }
}

// Danh sách các thông điệp chạy tuần tự trong quá trình phân tích
const SCANNING_STEPS = [
    "Đang trích xuất 468 điểm mốc nhân trắc học...",
    "Đang tính toán tỷ lệ vàng 1/3 và 1/5...",
    "Gemini AI đang phân tích thần thái và sắc tố da..."
];

let scanningSequenceTimers = [];

// Bắt đầu chuỗi hiệu ứng quét laser và dòng trạng thái biến đổi liên tục
function startScanningSequence(isCamera) {
    stopScanningSequence();

    if (isCamera) {
        cameraScanner.style.display = 'block';
        if (cameraScanningStatus) {
            cameraScanningStatus.style.display = 'flex';
        }
    } else {
        uploadScanner.style.display = 'block';
        if (uploadScanningStatus) {
            uploadScanningStatus.style.display = 'flex';
        }
    }

    // Bước 1: Trích xuất 468 điểm mốc
    updateScanningStatusText(SCANNING_STEPS[0]);

    // Bước 2: Tính toán tỷ lệ vàng 1/3 và 1/5 sau 1.3 giây
    const timer1 = setTimeout(() => {
        updateScanningStatusText(SCANNING_STEPS[1]);
    }, 1300);
    scanningSequenceTimers.push(timer1);

    // Bước 3: Phân tích thần thái và sắc tố da sau 2.6 giây
    const timer2 = setTimeout(() => {
        updateScanningStatusText(SCANNING_STEPS[2]);
    }, 2600);
    scanningSequenceTimers.push(timer2);
}

// Cập nhật nội dung hiển thị kèm hiệu ứng chuyển động mượt mà
function updateScanningStatusText(text) {
    const textEls = [cameraScanningText, uploadScanningText];
    textEls.forEach(el => {
        if (el) {
            el.classList.remove('text-fade-in');
            void el.offsetWidth;
            el.textContent = text;
            el.classList.add('text-fade-in');
        }
    });
}

// Dừng toàn bộ hiệu ứng quét laser và làm sạch hàng đợi đếm giờ
function stopScanningSequence() {
    scanningSequenceTimers.forEach(id => clearTimeout(id));
    scanningSequenceTimers = [];

    if (cameraScanner) cameraScanner.style.display = 'none';
    if (uploadScanner) uploadScanner.style.display = 'none';
    if (cameraScanningStatus) cameraScanningStatus.style.display = 'none';
    if (uploadScanningStatus) uploadScanningStatus.style.display = 'none';
}

// Chuyển đổi tab
cameraTabBtn.addEventListener('click', async () => {
    resetAllStates();
    cameraTabBtn.classList.add('active');
    uploadTabBtn.classList.remove('active');
    cameraSection.style.display = 'flex';
    uploadSection.style.display = 'none';
    if (faceLandmarker) {
        await faceLandmarker.setOptions({ runningMode: "VIDEO" });
    }
    startCamera();
});

uploadTabBtn.addEventListener('click', async () => {
    resetAllStates();
    uploadTabBtn.classList.add('active');
    cameraTabBtn.classList.remove('active');
    cameraSection.style.display = 'none';
    uploadSection.style.display = 'block';
    stopCamera();
    if (faceLandmarker) {
        await faceLandmarker.setOptions({ runningMode: "IMAGE" });
    }
});

// Bấm nút khởi động lại camera: xóa sạch kết quả cũ và kích hoạt lại luồng ghi hình mới
toggleCameraBtn.addEventListener('click', () => {
    resetAllStates();
    startCamera();
});

// Chụp ảnh từ khung video sang canvas và chuyển đổi sang Base64
function captureFrameAsBase64() {
    const videoWidth = videoElement.videoWidth || 640;
    const videoHeight = videoElement.videoHeight || 480;

    canvasElement.width = videoWidth;
    canvasElement.height = videoHeight;

    const ctx = canvasElement.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

    // Chuyển bức ảnh thành chuỗi mã hóa Base64
    const base64Data = canvasElement.toDataURL('image/jpeg', 0.92);

    // Tạm dừng hiển thị khung hình tĩnh trên canvas (đóng băng bức ảnh vừa chụp)
    canvasElement.style.display = 'block';
    cameraGuide.style.display = 'none';
    if (cameraHudStatus) {
        cameraHudStatus.style.display = 'none';
    }

    // Tạm ngưng vòng lặp AR khi đang đóng băng khung hình chụp
    stopLiveARLoop();

    return base64Data;
}

// Kiểm tra độ sáng trung bình của khung hình (phát hiện ảnh quá tối hoặc thiếu sáng)
function checkImageLuminance(imageSourceElement) {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 160;
    testCanvas.height = 120;
    const testCtx = testCanvas.getContext('2d');
    testCtx.drawImage(imageSourceElement, 0, 0, 160, 120);

    const imgData = testCtx.getImageData(0, 0, 160, 120);
    const data = imgData.data;
    let totalLuminance = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        totalLuminance += lum;
    }

    return totalLuminance / pixelCount;
}

// Hàm tính khoảng cách Euclid giữa 2 điểm pixel
function calculateDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Hàm tính khoảng cách vuông góc từ điểm đến đường thẳng tạo bởi 2 điểm
function pointToLineDistance(p, l1, l2) {
    const numerator = Math.abs((l2.y - l1.y) * p.x - (l2.x - l1.x) * p.y + l2.x * l1.y - l2.y * l1.x);
    const denominator = Math.sqrt(Math.pow(l2.y - l1.y, 2) + Math.pow(l2.x - l1.x, 2));
    return denominator === 0 ? 0 : numerator / denominator;
}

// Trích xuất điểm mốc và tính toán các chỉ số hình học khuôn mặt
function extractAndCalculateMetrics(landmarks, width, height, sourceElement) {
    // Chuyển đổi tọa độ chuẩn hóa sang tọa độ pixel thực tế
    const toPx = (point) => ({
        x: point.x * width,
        y: point.y * height
    });

    // Các điểm mốc quan trọng theo chuẩn MediaPipe Face Mesh
    const foreheadTop = toPx(landmarks[10]);     // Chân tóc / Đỉnh trán
    const glabella = toPx(landmarks[168]);        // Giữa hai chân mày
    const noseTip = toPx(landmarks[1]);           // Chóp mũi
    const subnasale = toPx(landmarks[2]);         // Chân mũi
    const chinBottom = toPx(landmarks[152]);      // Đỉnh cằm

    const eyeRightOuter = toPx(landmarks[33]);    // Khóe mắt ngoài bên phải
    const eyeRightInner = toPx(landmarks[133]);   // Khóe mắt trong bên phải
    const eyeLeftInner = toPx(landmarks[362]);    // Khóe mắt trong bên trái
    const eyeLeftOuter = toPx(landmarks[263]);    // Khóe mắt ngoài bên trái

    const mouthRight = toPx(landmarks[61]);       // Khóe miệng bên phải
    const mouthLeft = toPx(landmarks[291]);       // Khóe miệng bên trái

    const jawRight = toPx(landmarks[234]);        // Điểm gò má / hàm bên phải
    const jawLeft = toPx(landmarks[454]);         // Điểm gò má / hàm bên trái

    // 1. Tính tỷ lệ 3 phần chiều dọc (trán : mũi : cằm)
    const foreheadDist = Math.abs(glabella.y - foreheadTop.y);
    const noseDist = Math.abs(subnasale.y - glabella.y);
    const chinDist = Math.abs(chinBottom.y - subnasale.y);

    const totalVertical = foreheadDist + noseDist + chinDist;
    const foreheadPct = totalVertical > 0 ? (foreheadDist / totalVertical) * 100 : 33.3;
    const nosePct = totalVertical > 0 ? (noseDist / totalVertical) * 100 : 33.3;
    const chinPct = totalVertical > 0 ? (chinDist / totalVertical) * 100 : 33.3;

    const baseRatio = foreheadDist > 0 ? foreheadDist : 1;
    const verticalRatioText = `${(foreheadDist / baseRatio).toFixed(2)} : ${(noseDist / baseRatio).toFixed(2)} : ${(chinDist / baseRatio).toFixed(2)} (${foreheadPct.toFixed(1)}% - ${nosePct.toFixed(1)}% - ${chinPct.toFixed(1)}%)`;

    // 2. Tính tỷ lệ 5 phần chiều ngang (độ rộng mắt so với chiều ngang mặt)
    const rightEyeWidth = calculateDistance(eyeRightOuter, eyeRightInner);
    const leftEyeWidth = calculateDistance(eyeLeftInner, eyeLeftOuter);
    const avgEyeWidth = (rightEyeWidth + leftEyeWidth) / 2;
    const faceWidth = calculateDistance(jawRight, jawLeft);

    const eyeRatioPercent = faceWidth > 0 ? (avgEyeWidth / faceWidth) * 100 : 20.0;
    const horizontalEyeRatioText = `${eyeRatioPercent.toFixed(1)}% (độ rộng mắt trung bình so với bề ngang khuôn mặt)`;

    // Tính tỷ lệ chiều ngang so với chiều dọc mặt (xác định dáng mặt)
    const faceRatio = totalVertical > 0 ? (faceWidth / totalVertical) : 0.82;

    // Tính độ xếch của đuôi mắt (xác định dáng mắt)
    const eyeSlant = ((eyeLeftOuter.y - eyeLeftInner.y) + (eyeRightInner.y - eyeRightOuter.y)) / 2;

    // 3. Tính độ đối xứng (khoảng cách từ trục giữa mặt sang các điểm hai bên)
    const distEyeRight = pointToLineDistance(eyeRightOuter, glabella, chinBottom);
    const distEyeLeft = pointToLineDistance(eyeLeftOuter, glabella, chinBottom);

    const distInnerEyeRight = pointToLineDistance(eyeRightInner, glabella, chinBottom);
    const distInnerEyeLeft = pointToLineDistance(eyeLeftInner, glabella, chinBottom);

    const distMouthRight = pointToLineDistance(mouthRight, glabella, chinBottom);
    const distMouthLeft = pointToLineDistance(mouthLeft, glabella, chinBottom);

    const distJawRight = pointToLineDistance(jawRight, glabella, chinBottom);
    const distJawLeft = pointToLineDistance(jawLeft, glabella, chinBottom);

    const calcPairSymmetry = (d1, d2) => {
        const maxVal = Math.max(d1, d2);
        if (maxVal === 0) return 1.0;
        return 1.0 - Math.abs(d1 - d2) / maxVal;
    };

    const eyeSym = calcPairSymmetry(distEyeRight, distEyeLeft);
    const innerEyeSym = calcPairSymmetry(distInnerEyeRight, distInnerEyeLeft);
    const mouthSym = calcPairSymmetry(distMouthRight, distMouthLeft);
    const jawSym = calcPairSymmetry(distJawRight, distJawLeft);

    const overallSymmetry = ((eyeSym + innerEyeSym + mouthSym + jawSym) / 4) * 100;
    const symmetryScoreText = `${overallSymmetry.toFixed(1)}%`;

    // 4. Trích xuất sắc thái màu da thực tế (Personal Color)
    let skinWarmth = 15;
    try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(sourceElement, 0, 0, width, height);

        const sampleX = Math.round((noseTip.x + jawRight.x) / 2);
        const sampleY = Math.round((noseTip.y + subnasale.y) / 2);

        if (sampleX > 0 && sampleX < width && sampleY > 0 && sampleY < height) {
            const pixel = tempCtx.getImageData(sampleX, sampleY, 1, 1).data;
            skinWarmth = (pixel[0] - pixel[2]); // Chênh lệch đỏ - lam
        }
    } catch (e) {
        skinWarmth = 15;
    }

    return {
        points: {
            foreheadTop,
            glabella,
            noseTip,
            subnasale,
            chinBottom,
            eyeRightOuter,
            eyeRightInner,
            eyeLeftInner,
            eyeLeftOuter,
            mouthRight,
            mouthLeft,
            jawRight,
            jawLeft
        },
        foreheadPct,
        nosePct,
        chinPct,
        verticalRatioText,
        eyeRatioPercent,
        horizontalEyeRatioText,
        overallSymmetry,
        symmetryScoreText,
        faceRatio,
        eyeSlant,
        skinWarmth
    };
}

// Vẽ các đường đo lường và điểm mốc phụ trợ lên khung hình tĩnh
function drawLandmarksOverlay(metrics, width, height) {
    const ctx = canvasElement.getContext('2d');
    const pts = metrics.points;

    // Vẽ trục trung tâm khuôn mặt
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pts.glabella.x, pts.foreheadTop.y - 15);
    ctx.lineTo(pts.chinBottom.x, pts.chinBottom.y + 15);
    ctx.stroke();

    // Vẽ các đường gióng tỷ lệ chiều dọc màu Neon Tím
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
    ctx.setLineDash([]);
    const linesY = [pts.foreheadTop.y, pts.glabella.y, pts.subnasale.y, pts.chinBottom.y];
    linesY.forEach(y => {
        ctx.beginPath();
        ctx.moveTo(pts.jawRight.x - 20, y);
        ctx.lineTo(pts.jawLeft.x + 20, y);
        ctx.stroke();
    });

    // Vẽ các điểm mốc quan trọng màu Neon Cyan
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 8;
    Object.values(pts).forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3.5, 0, 2 * Math.PI);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    ctx.restore();
}

// Cập nhật các giá trị đo đạc lên bảng hiển thị chỉ số
function renderMetricsDashboard(metrics) {
    metricsContainer.style.display = 'grid';

    verticalRatioValue.textContent = `${metrics.foreheadPct.toFixed(1)}% : ${metrics.nosePct.toFixed(1)}% : ${metrics.chinPct.toFixed(1)}%`;
    foreheadBar.style.width = `${Math.min(100, metrics.foreheadPct * 2.2)}%`;
    foreheadPercent.textContent = `${metrics.foreheadPct.toFixed(1)}%`;
    noseBar.style.width = `${Math.min(100, metrics.nosePct * 2.2)}%`;
    nosePercent.textContent = `${metrics.nosePct.toFixed(1)}%`;
    chinBar.style.width = `${Math.min(100, metrics.chinPct * 2.2)}%`;
    chinPercent.textContent = `${metrics.chinPct.toFixed(1)}%`;

    horizontalRatioValue.textContent = `${metrics.eyeRatioPercent.toFixed(1)}%`;
    eyeWidthBar.style.width = `${Math.min(100, metrics.eyeRatioPercent * 4)}%`;

    symmetryValue.textContent = `${metrics.overallSymmetry.toFixed(1)}%`;
    symmetryBar.style.width = `${Math.min(100, metrics.overallSymmetry)}%`;
}

// Chuẩn hóa và bảo đảm dấu tiếng Việt đầy đủ và đúng chuẩn Unicode NFC
function normalizeVietnamese(text) {
    if (!text || typeof text !== 'string') return text || '';
    return text.normalize('NFC');
}

// Hiển thị kết quả phân tích có cấu trúc dưới dạng thẻ trực quan
function renderStructuredAnalysis(data, isDemo, notice) {
    const scoreVal = typeof data.harmonyScore === 'number' ? data.harmonyScore : 8.5;
    const scorePercent = Math.min(100, Math.max(0, scoreVal * 10));

    // Thông báo trạng thái kết nối API
    let statusBannerHtml = '';
    if (isDemo) {
        statusBannerHtml = `
            <div class="api-notice-banner warning-notice">
                <span class="banner-title">Thông báo trạng thái phân tích</span>
                <p class="banner-desc">Hệ thống đang hiển thị kết quả tính toán mô phỏng do tệp cấu hình máy chủ chưa có khóa GEMINI_API_KEY. Vui lòng thêm khóa API vào tệp backend/.env để kích hoạt mô hình Gemini phân tích trực tiếp từng bức ảnh.</p>
            </div>
        `;
    } else {
        statusBannerHtml = `
            <div class="api-notice-banner success-notice">
                <span class="banner-title">Đã kết nối Gemini API</span>
                <p class="banner-desc">Kết quả được phân tích trực tiếp từ mô hình trí tuệ nhân tạo Google Gemini dựa trên hình ảnh chân dung và các số liệu nhân trắc học.</p>
            </div>
        `;
    }

    // Xử lý danh sách 3 kiểu tóc đề xuất
    let hairstylesHtml = '';
    if (Array.isArray(data.recommended_hairstyles) && data.recommended_hairstyles.length > 0) {
        hairstylesHtml = data.recommended_hairstyles.map((style, idx) => `
            <div class="style-item-card">
                <span class="style-item-badge">Kiểu ${idx + 1}</span>
                <p class="style-item-desc">${normalizeVietnamese(style)}</p>
            </div>
        `).join('');
    } else {
        hairstylesHtml = '<p class="part-desc">Đang cập nhật các kiểu tóc phù hợp.</p>';
    }

    resultBody.innerHTML = `
        ${statusBannerHtml}

        <!-- Thẻ đặc trưng khí chất và sắc tố cá nhân -->
        <div class="vibe-container-grid">
            <div class="vibe-card highlight-vibe">
                <span class="vibe-label">Hệ Động Vật Diện Mạo</span>
                <span class="vibe-main-text">${normalizeVietnamese(data.vibe_type) || 'Đang xác định'}</span>
            </div>
            <div class="vibe-card">
                <span class="vibe-label">Dáng Mắt Chủ Đạo</span>
                <span class="vibe-sub-text">${normalizeVietnamese(data.eye_shape) || 'Dáng mắt tự nhiên'}</span>
            </div>
            <div class="vibe-card">
                <span class="vibe-label">Sắc Tố Cá Nhân (Personal Color)</span>
                <span class="vibe-sub-text">${normalizeVietnamese(data.skin_tone) || 'Tone tự nhiên hài hòa'}</span>
            </div>
        </div>

        <!-- Thẻ điểm số hài hòa và dáng khuôn mặt -->
        <div class="analysis-overview-grid">
            <div class="score-card">
                <span class="score-title">Điểm số hài hòa tổng thể</span>
                <div class="score-display-wrapper">
                    <span class="score-number">${scoreVal.toFixed(1)}</span>
                    <span class="score-max">/ 10</span>
                </div>
                <div class="score-track">
                    <div class="score-fill" style="width: ${scorePercent}%"></div>
                </div>
            </div>
            <div class="shape-card">
                <span class="shape-title">Dáng khuôn mặt chủ đạo</span>
                <span class="shape-value">${normalizeVietnamese(data.faceShape) || 'Hài hòa cân đối'}</span>
            </div>
        </div>

        <!-- Đề xuất 3 kiểu tóc phù hợp nhất -->
        <div class="hairstyles-section">
            <h3 class="parts-section-title">Đề Xuất 3 Kiểu Tóc Phù Hợp Nhất</h3>
            <div class="hairstyles-grid">
                ${hairstylesHtml}
            </div>
        </div>

        <!-- Đề xuất hình dáng gọng kính phù hợp -->
        <div class="glasses-section">
            <h3 class="parts-section-title">Hình Dáng Gọng Kính Phù Hợp</h3>
            <div class="glasses-card">
                <p class="glasses-desc">${normalizeVietnamese(data.recommended_glasses) || 'Gọng kính thanh mảnh, bo tròn nhẹ nhàng.'}</p>
            </div>
        </div>

        <!-- Nhận xét ưu điểm từng bộ phận -->
        <div class="parts-section">
            <h3 class="parts-section-title">Nhận Xét Ưu Điểm Từng Bộ Phận</h3>
            <div class="parts-grid">
                <div class="part-card">
                    <span class="part-title">Đôi Mắt và Ánh Nhìn</span>
                    <p class="part-desc">${normalizeVietnamese(data.featuresAnalysis?.eyes) || 'Ánh nhìn tươi sáng, đường nét thanh tú.'}</p>
                </div>
                <div class="part-card">
                    <span class="part-title">Sống Mũi và Tỷ Lệ</span>
                    <p class="part-desc">${normalizeVietnamese(data.featuresAnalysis?.nose) || 'Dáng mũi tự nhiên, tạo điểm nhấn cân xứng cho khuôn mặt.'}</p>
                </div>
                <div class="part-card">
                    <span class="part-title">Khuôn Miệng và Nụ Cười</span>
                    <p class="part-desc">${normalizeVietnamese(data.featuresAnalysis?.lips) || 'Đường viền môi duyên dáng, nụ cười rạng rỡ.'}</p>
                </div>
                <div class="part-card">
                    <span class="part-title">Xương Hàm và Cằm</span>
                    <p class="part-desc">${normalizeVietnamese(data.featuresAnalysis?.jawline) || 'Đường viền hàm thon gọn, cằm cân đối với tổng thể.'}</p>
                </div>
            </div>
        </div>

        <!-- Lời đúc kết diện mạo -->
        <div class="summary-card">
            <h4 class="summary-title">Lời Đúc Kết Diện Mạo</h4>
            <p class="summary-text">${normalizeVietnamese(data.summary) || 'Khuôn mặt mang đường nét thanh tú, hài hòa và thần thái cuốn hút.'}</p>
        </div>
    `;
    resultBody.style.display = 'block';

    // Cập nhật thẻ kết quả Story 9:16
    updateStoryCardContent(data, lastAnalyzedMetrics, lastAnalyzedImageBase64);
}

// Cập nhật nội dung cho thẻ kết quả Story 9:16
function updateStoryCardContent(data, metrics, imageBase64) {
    if (!data) return;

    if (imageBase64 && storyPortraitImg) {
        storyPortraitImg.src = imageBase64;
    }

    if (storyVibeBadgeVal) {
        storyVibeBadgeVal.textContent = normalizeVietnamese(data.vibe_type) || 'Hài hòa';
    }

    const scoreVal = typeof data.harmonyScore === 'number' ? data.harmonyScore : 8.8;
    if (storyScoreBig) {
        storyScoreBig.textContent = scoreVal.toFixed(1);
    }
    if (storyScoreFill) {
        storyScoreFill.style.width = `${Math.min(100, Math.max(0, scoreVal * 10))}%`;
    }

    if (storyShapeName) {
        storyShapeName.textContent = normalizeVietnamese(data.faceShape) || 'Trái xoan';
    }
    if (storyEyeShape) {
        storyEyeShape.textContent = normalizeVietnamese(data.eye_shape) || 'Dáng mắt tự nhiên';
    }

    const skinToneText = normalizeVietnamese(data.skin_tone) || 'Tone tự nhiên hài hòa';
    if (storyColorDesc) {
        storyColorDesc.textContent = skinToneText;
    }

    // Xác định bảng màu phù hợp theo Personal Color
    let swatches = [
        { name: 'Đất ấm', hex: '#D97736' },
        { name: 'Caramel', hex: '#E6A15C' },
        { name: 'Rêu ấm', hex: '#859438' },
        { name: 'Be nhạt', hex: '#D4A373' },
        { name: 'Cam cháy', hex: '#C84B31' }
    ];

    const lowerTone = skinToneText.toLowerCase();
    if (lowerTone.includes('lạnh') || lowerTone.includes('cool') || lowerTone.includes('hạ') || lowerTone.includes('đông')) {
        swatches = [
            { name: 'Xám đá', hex: '#4A6984' },
            { name: 'Oải hương', hex: '#9381FF' },
            { name: 'Hồng tro', hex: '#C86D8B' },
            { name: 'Navy sâu', hex: '#1D3557' },
            { name: 'Ngọc lạnh', hex: '#70A9A1' }
        ];
    }

    if (storySwatchesRow) {
        storySwatchesRow.innerHTML = swatches.map(sw => `
            <div class="story-swatch-item">
                <div class="story-swatch-circle" style="background-color: ${sw.hex};"></div>
                <span class="story-swatch-name">${sw.name}</span>
            </div>
        `).join('');
    }

    if (metrics) {
        if (storyVerticalText) {
            storyVerticalText.textContent = `${metrics.foreheadPct.toFixed(0)}% : ${metrics.nosePct.toFixed(0)}% : ${metrics.chinPct.toFixed(0)}%`;
        }
        if (storySymmetryText) {
            storySymmetryText.textContent = `${metrics.overallSymmetry.toFixed(1)}%`;
        }
    }
}

// Xử lý tạo và tải thẻ kết quả tỷ lệ 9:16 bằng html2canvas
async function exportStoryCard(buttonTrigger) {
    if (typeof html2canvas !== 'function') {
        alert('Thư viện tạo hình ảnh chưa được tải xong. Vui lòng thử lại sau giây lát.');
        return;
    }

    if (!storyCard) return;

    // Lưu lại giao diện ban đầu của nút bấm
    const originalContent = buttonTrigger ? buttonTrigger.innerHTML : '';
    if (buttonTrigger) {
        buttonTrigger.disabled = true;
        buttonTrigger.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Đang tạo ảnh 9:16...
        `;
    }

    try {
        // Đảm bảo cập nhật dữ liệu mới nhất
        if (lastAnalyzedData) {
            updateStoryCardContent(lastAnalyzedData, lastAnalyzedMetrics, lastAnalyzedImageBase64);
        }

        // Đảm bảo ảnh chân dung đã tải xong
        if (storyPortraitImg && !storyPortraitImg.complete) {
            await new Promise(resolve => {
                storyPortraitImg.onload = resolve;
                storyPortraitImg.onerror = resolve;
            });
        }

        // Tạm thời đưa khung ảnh vào viewport để html2canvas kết xuất chính xác kích thước
        storyCardContainer.style.opacity = '1';
        storyCardContainer.style.zIndex = '-999';

        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(storyCard, {
            scale: 2.4, // Độ phân giải chuẩn 1080x1920 (9:16 Full HD)
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#080c18',
            logging: false
        });

        // Tạo liên kết tải tệp ảnh xuống thiết bị
        const downloadLink = document.createElement('a');
        downloadLink.download = `the-ket-qua-dien-mao-${Date.now()}.png`;
        downloadLink.href = canvas.toDataURL('image/png', 0.95);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } catch (err) {
        console.error('Lỗi khi xuất thẻ kết quả Story:', err);
    } finally {
        storyCardContainer.style.opacity = '0';
        if (buttonTrigger) {
            buttonTrigger.disabled = false;
            buttonTrigger.innerHTML = originalContent;
        }
    }
}

// Gán sự kiện click tải thẻ
if (downloadStoryBtn) {
    downloadStoryBtn.addEventListener('click', () => exportStoryCard(downloadStoryBtn));
}
if (downloadStoryBtnBottom) {
    downloadStoryBtnBottom.addEventListener('click', () => exportStoryCard(downloadStoryBtnBottom));
}

// Xử lý chụp ảnh và phân tích toàn diện
captureAnalyzeBtn.addEventListener('click', async () => {
    if (!videoElement.videoWidth) {
        cameraNotice.textContent = 'Chưa nhận được tín hiệu hình ảnh từ camera.';
        return;
    }

    const base64Image = captureFrameAsBase64();
    await processAndAnalyze(canvasElement, base64Image, 'image/jpeg', true);
});

// Xử lý tải ảnh từ thiết bị
selectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleUploadFile(file);
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleUploadFile(file);
    }
});

removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUpload();
});

function handleUploadFile(file) {
    currentMimeType = file.type || 'image/jpeg';
    const reader = new FileReader();

    reader.onload = (event) => {
        currentFileBase64 = event.target.result;
        imagePreview.src = currentFileBase64;
        dropContent.style.display = 'none';
        previewWrapper.style.display = 'flex';
        analyzeUploadBtn.disabled = false;
        warningBox.style.display = 'none';
    };

    reader.readAsDataURL(file);
}

function resetUpload() {
    resetAllStates();
    fileInput.value = '';
    imagePreview.src = '';
    previewWrapper.style.display = 'none';
    dropContent.style.display = 'flex';
    analyzeUploadBtn.disabled = true;
}

analyzeUploadBtn.addEventListener('click', async () => {
    if (!currentFileBase64) return;
    await processAndAnalyze(imagePreview, currentFileBase64, currentMimeType, false);
});

// Quy trình kiểm thử, trích xuất điểm mốc và gửi yêu cầu phân tích
async function processAndAnalyze(imageSourceElement, imageBase64, mimeType, isFromCamera) {
    warningBox.style.display = 'none';
    warningBox.innerHTML = '';

    // Kiểm tra chất lượng ánh sáng của hình ảnh
    const avgBrightness = checkImageLuminance(imageSourceElement);
    if (avgBrightness < 36) {
        warningBox.textContent = 'Hình ảnh quá tối hoặc môi trường thiếu sáng trầm trọng. Vui lòng bật thêm đèn hoặc đứng ở nơi có nguồn sáng rõ ràng để hệ thống nhận diện chính xác.';
        warningBox.style.display = 'block';
        resultSection.style.display = 'block';
        if (isFromCamera) {
            canvasElement.style.display = 'none';
            cameraGuide.style.display = 'flex';
            if (cameraHudStatus) cameraHudStatus.style.display = 'flex';
            startLiveARLoop();
        }
        return;
    } else if (avgBrightness > 245) {
        warningBox.textContent = 'Hình ảnh bị chói sáng hoặc dư sáng quá mức. Vui lòng điều chỉnh lại hướng nguồn sáng để các đường nét không bị mờ nhạt.';
        warningBox.style.display = 'block';
    }

    captureAnalyzeBtn.disabled = true;
    analyzeUploadBtn.disabled = true;

    // Lưu lại ảnh đầu vào phục vụ kết xuất thẻ Story
    lastAnalyzedImageBase64 = imageBase64;

    // Không hiển thị khung kết quả trong thời gian chờ để tập trung vào bức ảnh và dòng trạng thái
    resultSection.style.display = 'none';
    resultBody.innerHTML = '';
    metricsContainer.style.display = 'none';

    // Kích hoạt tia laser quét dọc bức ảnh và dòng trạng thái biến đổi liên tục dưới bức ảnh
    startScanningSequence(isFromCamera);

    let calculatedMetrics = null;

    // Trích xuất và kiểm tra xem có phát hiện mặt người không
    if (faceLandmarker) {
        try {
            // Đảm bảo chế độ nhận diện ảnh tĩnh nếu là tệp ảnh tải lên
            if (!isFromCamera) {
                await faceLandmarker.setOptions({ runningMode: "IMAGE" });
            }

            const detections = isFromCamera 
                ? faceLandmarker.detectForVideo(imageSourceElement, performance.now())
                : faceLandmarker.detect(imageSourceElement);

            if (!detections || !detections.faceLandmarks || detections.faceLandmarks.length === 0) {
                stopScanningSequence();
                captureAnalyzeBtn.disabled = false;
                analyzeUploadBtn.disabled = false;

                warningBox.textContent = 'Không tìm thấy khuôn mặt trong hình ảnh. Vui lòng căn chỉnh lại góc nhìn thẳng vào ống kính và bảo đảm khuôn mặt không bị che khuất.';
                warningBox.style.display = 'block';
                resultSection.style.display = 'block';

                if (isFromCamera) {
                    canvasElement.style.display = 'none';
                    cameraGuide.style.display = 'flex';
                    if (cameraHudStatus) cameraHudStatus.style.display = 'flex';
                    startLiveARLoop();
                }
                return;
            }

            const landmarks = detections.faceLandmarks[0];
            const width = imageSourceElement.naturalWidth || imageSourceElement.videoWidth || imageSourceElement.width || 640;
            const height = imageSourceElement.naturalHeight || imageSourceElement.videoHeight || imageSourceElement.height || 480;

            calculatedMetrics = extractAndCalculateMetrics(landmarks, width, height, imageSourceElement);

            // Nếu nguồn là canvas của camera, vẽ các đường gióng tỷ lệ
            if (imageSourceElement === canvasElement) {
                drawLandmarksOverlay(calculatedMetrics, width, height);
            }
        } catch (landmarkErr) {
            console.warn('Lỗi trích xuất điểm mốc:', landmarkErr);
        }
    }

    // Thiết lập thời gian quét tối thiểu 3.6 giây để người dùng theo dõi trọn vẹn 3 giai đoạn phân tích
    const minScanTimer = new Promise(resolve => setTimeout(resolve, 3600));

    try {
        const fetchPromise = fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageBase64: imageBase64,
                mimeType: mimeType,
                metrics: calculatedMetrics
            })
        }).then(res => res.json());

        // Đợi đồng thời cả cuộc gọi mạng và chuỗi thời gian hiển thị thông điệp
        const [resData] = await Promise.all([fetchPromise, minScanTimer]);

        // Dừng tia laser và dòng trạng thái quét
        stopScanningSequence();

        // Cập nhật các tỷ lệ hình học lên bảng đo đạc
        if (calculatedMetrics) {
            renderMetricsDashboard(calculatedMetrics);
        }

        if (resData.success && (resData.data || resData.vibe_type)) {
            const finalData = resData.data || resData;
            lastAnalyzedData = finalData;
            lastAnalyzedMetrics = calculatedMetrics;
            renderStructuredAnalysis(finalData, resData.isDemo, resData.notice);
            updateStoryCardContent(finalData, calculatedMetrics, lastAnalyzedImageBase64);
            resultSection.style.display = 'block';
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Tự động lưu lần phân tích này vào lịch sử trình duyệt
            saveScanToHistory(finalData, calculatedMetrics, lastAnalyzedImageBase64);

            // Tự động tăng số lượng khuôn mặt đã phân tích trong tuần thêm 1 lượt
            incrementWeeklyScanCount();
        } else {
            resultBody.innerHTML = `<div class="error-message">${resData.message || 'Không thể thực hiện đánh giá. Vui lòng kiểm tra lại cấu hình hệ thống.'}</div>`;
            resultBody.style.display = 'block';
            resultSection.style.display = 'block';
        }
    } catch (err) {
        stopScanningSequence();
        resultBody.innerHTML = '<div class="error-message">Không thể kết nối đến máy chủ xử lý. Vui lòng kiểm tra lại dịch vụ máy chủ.</div>';
        resultBody.style.display = 'block';
        resultSection.style.display = 'block';
    } finally {
        stopScanningSequence();
        captureAnalyzeBtn.disabled = false;
        analyzeUploadBtn.disabled = false;
    }
}

// ==========================================================================
// Quản Lý Lịch Sử Phân Tích (LocalStorage) & So Sánh Diện Mạo Hai Lần Quét
// ==========================================================================

// Nén ảnh chân dung thành ảnh thu nhỏ để lưu trữ an toàn trong localStorage
async function createThumbnail(base64Str, maxWidth = 120, maxHeight = 120) {
    return new Promise((resolve) => {
        if (!base64Str) return resolve('');
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = width;
            thumbCanvas.height = height;
            const ctx = thumbCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(thumbCanvas.toDataURL('image/jpeg', 0.65));
        };
        img.onerror = () => resolve('');
        img.src = base64Str;
    });
}

// Đọc danh sách lịch sử từ localStorage
function getStoredHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Lỗi đọc lịch sử từ localStorage:', e);
        return [];
    }
}

// Ghi danh sách lịch sử vào localStorage
function setStoredHistory(historyList) {
    try {
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(historyList));
        updateHistoryCountBadge(historyList.length);
    } catch (e) {
        console.warn('Lỗi ghi lịch sử vào localStorage:', e);
    }
}

// Cập nhật số lượng lượt quét trên nút nổi
function updateHistoryCountBadge(count) {
    if (historyCountBadge) {
        historyCountBadge.textContent = count;
    }
}

// Lưu một lần quét mới vào lịch sử
async function saveScanToHistory(data, metrics, imageBase64) {
    if (!data) return;
    try {
        const thumbnail = await createThumbnail(imageBase64, 120, 120);
        const historyList = getStoredHistory();

        const now = new Date();
        const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

        const newScanItem = {
            id: 'scan_' + Date.now(),
            timestamp: formattedTime,
            thumbnail: thumbnail || imageBase64,
            fullImage: imageBase64,
            data: data,
            metrics: metrics,
            vibe_type: data.vibe_type || 'Chưa xác định',
            harmonyScore: typeof data.harmonyScore === 'number' ? data.harmonyScore : 8.5,
            faceShape: data.faceShape || 'Trái xoan',
            skin_tone: data.skin_tone || 'Tone tự nhiên',
            eye_shape: data.eye_shape || 'Dáng mắt tự nhiên'
        };

        // Giữ tối đa 10 lượt quét gần nhất để bảo đảm dung lượng lưu trữ an toàn
        historyList.unshift(newScanItem);
        if (historyList.length > 10) {
            historyList.length = 10;
        }

        setStoredHistory(historyList);
        renderHistoryDrawer();
    } catch (err) {
        console.warn('Lỗi khi lưu lịch sử:', err);
    }
}

// Cập nhật trạng thái thanh công cụ so sánh
function updateCompareToolbar() {
    const count = selectedScansForCompare.length;
    if (compareCounterBadge) {
        compareCounterBadge.textContent = `Đã chọn ${count}/2`;
    }
    if (triggerCompareBtn) {
        triggerCompareBtn.disabled = count !== 2;
    }
}

// Bật hoặc tắt chọn một lượt quét để so sánh
function toggleSelectCompare(scanId) {
    const idx = selectedScansForCompare.indexOf(scanId);
    if (idx > -1) {
        selectedScansForCompare.splice(idx, 1);
    } else {
        if (selectedScansForCompare.length >= 2) {
            // Thay thế mục đầu tiên nếu đã chọn đủ 2
            selectedScansForCompare.shift();
        }
        selectedScansForCompare.push(scanId);
    }
    renderHistoryDrawer();
}

// Tải lại một lượt phân tích cũ lên màn hình chính
function loadScanIntoView(scanId) {
    const historyList = getStoredHistory();
    const targetScan = historyList.find(s => s.id === scanId);
    if (!targetScan) return;

    lastAnalyzedData = targetScan.data;
    lastAnalyzedMetrics = targetScan.metrics;
    lastAnalyzedImageBase64 = targetScan.fullImage || targetScan.thumbnail;

    // Hiển thị lại bảng chỉ số đo đạc
    if (targetScan.metrics) {
        renderMetricsDashboard(targetScan.metrics);
    }

    // Hiển thị lại bảng phân tích chi tiết
    renderStructuredAnalysis(targetScan.data, false);

    // Cập nhật lại thẻ Story 9:16
    updateStoryCardContent(targetScan.data, targetScan.metrics, lastAnalyzedImageBase64);

    resultSection.style.display = 'block';
    closeHistoryDrawer();

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Xóa một lượt quét khỏi lịch sử
function deleteHistoryScan(scanId) {
    let historyList = getStoredHistory();
    historyList = historyList.filter(s => s.id !== scanId);
    setStoredHistory(historyList);

    // Xóa khỏi danh sách so sánh nếu đang chọn
    selectedScansForCompare = selectedScansForCompare.filter(id => id !== scanId);
    renderHistoryDrawer();
}

// Xóa sạch toàn bộ lịch sử
function clearAllHistory() {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử phân tích trên trình duyệt không?')) {
        return;
    }
    setStoredHistory([]);
    selectedScansForCompare = [];
    renderHistoryDrawer();
}

// Hiển thị danh sách các thẻ lịch sử trong ngăn kéo
function renderHistoryDrawer() {
    if (!historyListContainer) return;

    const historyList = getStoredHistory();
    updateHistoryCountBadge(historyList.length);
    updateCompareToolbar();

    if (historyList.length === 0) {
        historyListContainer.innerHTML = `
            <div class="history-empty">
                <p>Chưa có lượt phân tích nào được lưu trữ.</p>
                <p class="history-empty-sub">Hãy chụp ảnh hoặc tải ảnh lên để hệ thống tự động ghi nhớ các kết quả phân tích của bạn.</p>
            </div>
        `;
        return;
    }

    historyListContainer.innerHTML = historyList.map(item => {
        const isSelected = selectedScansForCompare.includes(item.id);
        const scoreVal = typeof item.harmonyScore === 'number' ? item.harmonyScore.toFixed(1) : '8.5';
        
        return `
            <div class="history-card ${isSelected ? 'is-selected-for-compare' : ''}" data-scan-id="${item.id}">
                <div class="history-card-top">
                    <img src="${item.thumbnail || item.fullImage}" alt="Ảnh chân dung" class="history-thumb-img">
                    <div class="history-info-meta">
                        <span class="history-time">${item.timestamp}</span>
                        <div class="history-vibe-name">${normalizeVietnamese(item.vibe_type)}</div>
                        <div class="history-score-tag">Điểm hài hòa: ${scoreVal}/10 • ${normalizeVietnamese(item.faceShape)}</div>
                    </div>
                </div>
                <div class="history-card-bottom">
                    <button type="button" class="btn btn-secondary btn-sm btn-view-history" data-id="${item.id}">
                        <svg class="btn-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Xem lại
                    </button>
                    <button type="button" class="btn-history-compare-check ${isSelected ? 'is-active' : ''}" data-id="${item.id}">
                        <svg class="btn-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        ${isSelected ? 'Đã chọn so sánh' : 'Chọn so sánh'}
                    </button>
                    <button type="button" class="btn btn-secondary btn-icon-only btn-delete-history" data-id="${item.id}" title="Xóa lần quét này">
                        <svg class="btn-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Gắn sự kiện cho các nút trong danh sách
    historyListContainer.querySelectorAll('.btn-view-history').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            loadScanIntoView(id);
        });
    });

    historyListContainer.querySelectorAll('.btn-history-compare-check').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            toggleSelectCompare(id);
        });
    });

    historyListContainer.querySelectorAll('.btn-delete-history').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            deleteHistoryScan(id);
        });
    });
}

// Mở ngăn kéo lịch sử
function openHistoryDrawer() {
    renderHistoryDrawer();
    if (historyOverlay) {
        historyOverlay.style.display = 'block';
        requestAnimationFrame(() => historyOverlay.classList.add('is-active'));
    }
    if (historyDrawer) {
        historyDrawer.classList.add('is-open');
        historyDrawer.setAttribute('aria-hidden', 'false');
    }
}

// Đóng ngăn kéo lịch sử
function closeHistoryDrawer() {
    if (historyOverlay) {
        historyOverlay.classList.remove('is-active');
        setTimeout(() => {
            if (!historyOverlay.classList.contains('is-active')) {
                historyOverlay.style.display = 'none';
            }
        }, 300);
    }
    if (historyDrawer) {
        historyDrawer.classList.remove('is-open');
        historyDrawer.setAttribute('aria-hidden', 'true');
    }
}

// Mở hộp thoại so sánh 2 lần quét
function openCompareModal() {
    if (selectedScansForCompare.length !== 2) return;

    const historyList = getStoredHistory();
    const scanA = historyList.find(s => s.id === selectedScansForCompare[0]);
    const scanB = historyList.find(s => s.id === selectedScansForCompare[1]);
    if (!scanA || !scanB) return;

    const scoreA = typeof scanA.harmonyScore === 'number' ? scanA.harmonyScore : 8.5;
    const scoreB = typeof scanB.harmonyScore === 'number' ? scanB.harmonyScore : 8.5;
    const scoreDiff = (scoreB - scoreA).toFixed(1);
    const scoreDiffText = scoreB > scoreA 
        ? `Lần 2 cao hơn ${Math.abs(scoreDiff)} điểm` 
        : (scoreB < scoreA ? `Lần 1 cao hơn ${Math.abs(scoreDiff)} điểm` : 'Điểm số hài hòa tương đương');

    const symA = scanA.metrics ? scanA.metrics.overallSymmetry.toFixed(1) + '%' : 'Đang tính';
    const symB = scanB.metrics ? scanB.metrics.overallSymmetry.toFixed(1) + '%' : 'Đang tính';

    const vertA = scanA.metrics ? `${scanA.metrics.foreheadPct.toFixed(0)}% : ${scanA.metrics.nosePct.toFixed(0)}% : ${scanA.metrics.chinPct.toFixed(0)}%` : 'Chuẩn mực';
    const vertB = scanB.metrics ? `${scanB.metrics.foreheadPct.toFixed(0)}% : ${scanB.metrics.nosePct.toFixed(0)}% : ${scanB.metrics.chinPct.toFixed(0)}%` : 'Chuẩn mực';

    compareModalBody.innerHTML = `
        <div class="compare-grid">
            <!-- Cột Lần Quét 1 -->
            <div class="compare-col">
                <div class="compare-portrait-wrap">
                    <img src="${scanA.thumbnail || scanA.fullImage}" alt="Ảnh lần 1" class="compare-img">
                    <div class="compare-col-meta">
                        <span class="compare-label-pill">LẦN QUÉT 1</span>
                        <span class="compare-time">${scanA.timestamp}</span>
                        <div class="compare-vibe-name">${normalizeVietnamese(scanA.vibe_type)}</div>
                    </div>
                </div>

                <div class="compare-score-box">
                    <span class="compare-score-label">Điểm số hài hòa</span>
                    <span class="compare-score-val">${scoreA.toFixed(1)} / 10</span>
                </div>

                <div class="compare-metric-row">
                    <span class="compare-metric-label">Dáng khuôn mặt</span>
                    <span class="compare-metric-val">${normalizeVietnamese(scanA.faceShape)}</span>
                </div>
                <div class="compare-metric-row">
                    <span class="compare-metric-label">Dáng mắt chủ đạo</span>
                    <span class="compare-metric-val">${normalizeVietnamese(scanA.eye_shape)}</span>
                </div>
                <div class="compare-metric-row">
                    <span class="compare-metric-label">Tỷ lệ ba tầng dọc</span>
                    <span class="compare-metric-val">${vertA}</span>
                </div>
                <div class="compare-metric-row">
                    <span class="compare-metric-label">Độ đối xứng hai bên</span>
                    <span class="compare-metric-val">${symA}</span>
                </div>
                <div class="compare-metric-row">
                    <span class="compare-metric-label">Sắc tố cá nhân</span>
                    <span class="compare-metric-val">${normalizeVietnamese(scanA.skin_tone)}</span>
                </div>
            </div>

            <!-- Cột Lần Quét 2 -->
            <div class="compare-col">
                <div class="compare-portrait-wrap">
                    <img src="${scanB.thumbnail || scanB.fullImage}" alt="Ảnh lần 2" class="compare-img">
                    <div class="compare-col-meta">
                        <span class="compare-label-pill">LẦN QUÉT 2</span>
                        <span class="compare-time">${scanB.timestamp}</span>
                        <div class="compare-vibe-name">${normalizeVietnamese(scanB.vibe_type)}</div>
                    </div>
                </div>

                <div class="compare-score-box">
                    <span class="compare-score-label">Điểm số hài hòa</span>
                    <span class="compare-score-val">${scoreB.toFixed(1)} / 10</span>
                </div>

                <div class="compare-metric-row">
                    <span class="compare-metric-label">Dáng khuôn mặt</span>
                    <span class="compare-metric-val">${normalizeVietnamese(scanB.faceShape)}</span>
                </div>
                <div class="compare-metric-row">
                    <span class="compare-metric-label">Dáng mắt chủ đạo</span>
                    <span class="compare-metric-val">${normalizeVietnamese(scanB.eye_shape)}</span>
                </div>
                <div class="compare-metric-row">
                    <span class="compare-metric-label">Tỷ lệ ba tầng dọc</span>
                    <span class="compare-metric-val">${vertB}</span>
                </div>
                <div class="compare-metric-row">
                    <span class="compare-metric-label">Độ đối xứng hai bên</span>
                    <span class="compare-metric-val">${symB}</span>
                </div>
                <div class="compare-metric-row">
                    <span class="compare-metric-label">Sắc tố cá nhân</span>
                    <span class="compare-metric-val">${normalizeVietnamese(scanB.skin_tone)}</span>
                </div>
            </div>
        </div>

        <!-- Bảng Tổng Hợp Đối Chiếu -->
        <div class="compare-diff-section">
            <h4 class="compare-diff-title">Nhận Định Đối Chiếu Hai Trạng Thái</h4>
            <table class="compare-diff-table">
                <thead>
                    <tr>
                        <th>Chỉ số</th>
                        <th>Lần 1</th>
                        <th>Lần 2</th>
                        <th>Thay đổi</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Điểm hài hòa</td>
                        <td>${scoreA.toFixed(1)}</td>
                        <td>${scoreB.toFixed(1)}</td>
                        <td>${scoreDiffText}</td>
                    </tr>
                    <tr>
                        <td>Độ đối xứng</td>
                        <td>${symA}</td>
                        <td>${symB}</td>
                        <td>${scanA.metrics && scanB.metrics ? (scanB.metrics.overallSymmetry - scanA.metrics.overallSymmetry > 0 ? '+' : '') + (scanB.metrics.overallSymmetry - scanA.metrics.overallSymmetry).toFixed(1) + '%' : '--'}</td>
                    </tr>
                    <tr>
                        <td>Khí chất diện mạo</td>
                        <td>${normalizeVietnamese(scanA.vibe_type)}</td>
                        <td>${normalizeVietnamese(scanB.vibe_type)}</td>
                        <td>${scanA.vibe_type === scanB.vibe_type ? 'Đồng nhất' : 'Biến đổi thần thái'}</td>
                    </tr>
                </tbody>
            </table>

            <div class="compare-summary-box">
                Sự thay đổi giữa hai lần quét thường phản ánh góc chụp, điều kiện ánh sáng hoặc biểu cảm khuôn mặt. Việc duy trì góc nhìn chính diện và ánh sáng đồng đều sẽ giúp các chỉ số nhân trắc học đạt độ chuẩn xác tối ưu nhất.
            </div>
        </div>
    `;

    compareModalOverlay.style.display = 'flex';
}

function closeCompareModal() {
    if (compareModalOverlay) {
        compareModalOverlay.style.display = 'none';
    }
}

// Đọc số lượng khuôn mặt phân tích trong tuần từ bộ nhớ cục bộ
function getWeeklyScanCount() {
    try {
        const stored = localStorage.getItem(STORAGE_WEEKLY_COUNT_KEY);
        if (stored) {
            const val = parseInt(stored, 10);
            if (!isNaN(val) && val >= BASE_WEEKLY_COUNT) {
                return val;
            }
        }
    } catch (e) {
        console.warn('Lỗi đọc số đếm tuần:', e);
    }
    return BASE_WEEKLY_COUNT;
}

// Cập nhật số đếm hiển thị trên thanh thông báo
function updateWeeklyScanCountDisplay() {
    if (!weeklyFaceCount) return;
    const count = getWeeklyScanCount();
    weeklyFaceCount.textContent = count.toLocaleString('en-US');
}

// Tăng số lượng phân tích trong tuần thêm 1 sau mỗi lần chụp
function incrementWeeklyScanCount() {
    try {
        const current = getWeeklyScanCount();
        const next = current + 1;
        localStorage.setItem(STORAGE_WEEKLY_COUNT_KEY, next.toString());
        updateWeeklyScanCountDisplay();
    } catch (e) {
        console.warn('Lỗi tăng số đếm tuần:', e);
    }
}

// Khởi chạy ứng dụng
window.addEventListener('DOMContentLoaded', async () => {
    // Khởi tạo hiển thị bộ đếm số lượt phân tích trong tuần
    updateWeeklyScanCountDisplay();

    // Khởi tạo hiển thị số lượng trong lịch sử
    renderHistoryDrawer();

    // Gắn sự kiện điều khiển ngăn kéo lịch sử
    if (openHistoryBtn) openHistoryBtn.addEventListener('click', openHistoryDrawer);
    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistoryDrawer);
    if (historyOverlay) historyOverlay.addEventListener('click', closeHistoryDrawer);
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearAllHistory);
    if (triggerCompareBtn) triggerCompareBtn.addEventListener('click', openCompareModal);

    // Gắn sự kiện đóng hộp thoại so sánh
    if (closeCompareModalBtn) closeCompareModalBtn.addEventListener('click', closeCompareModal);
    if (compareModalOverlay) {
        compareModalOverlay.addEventListener('click', (e) => {
            if (e.target === compareModalOverlay) closeCompareModal();
        });
    }

    await initFaceLandmarker();
    startCamera();
});
