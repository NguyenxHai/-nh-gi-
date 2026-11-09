import {
    FaceLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

// Khai báo các thành phần giao diện
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const captureAnalyzeBtn = document.getElementById('captureAnalyzeBtn');
const toggleCameraBtn = document.getElementById('toggleCameraBtn');
const cameraNotice = document.getElementById('cameraNotice');
const cameraGuide = document.getElementById('cameraGuide');
const cameraScanner = document.getElementById('cameraScanner');
const uploadScanner = document.getElementById('uploadScanner');

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

// Khởi tạo công cụ nhận diện điểm mốc khuôn mặt MediaPipe
async function initFaceLandmarker() {
    try {
        cameraNotice.textContent = 'Đang tải bộ mô hình nhận diện điểm mốc...';
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
                runningMode: "IMAGE",
                numFaces: 1
            });
        } catch (gpuError) {
            faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "CPU"
                },
                outputFaceBlendshapes: false,
                runningMode: "IMAGE",
                numFaces: 1
            });
        }

        cameraNotice.textContent = 'Hệ thống đã sẵn sàng. Hãy căn chỉnh khuôn mặt vào giữa khung hình.';
        captureAnalyzeBtn.disabled = false;
    } catch (err) {
        cameraNotice.textContent = 'Không thể nạp mô hình nhận diện điểm mốc. Vui lòng tải lại trang hoặc kiểm tra kết nối mạng.';
    }
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
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    if (videoElement.srcObject) {
        videoElement.srcObject = null;
    }
}

// Điều khiển hiệu ứng tia quét laser chờ xử lý
function startScanningAnimation(isCamera) {
    if (isCamera) {
        cameraScanner.style.display = 'block';
    } else {
        uploadScanner.style.display = 'block';
    }
}

function stopScanningAnimation() {
    cameraScanner.style.display = 'none';
    uploadScanner.style.display = 'none';
}

// Chuyển đổi tab
cameraTabBtn.addEventListener('click', () => {
    cameraTabBtn.classList.add('active');
    uploadTabBtn.classList.remove('active');
    cameraSection.style.display = 'flex';
    uploadSection.style.display = 'none';
    warningBox.style.display = 'none';
    startCamera();
});

uploadTabBtn.addEventListener('click', () => {
    uploadTabBtn.classList.add('active');
    cameraTabBtn.classList.remove('active');
    cameraSection.style.display = 'none';
    uploadSection.style.display = 'block';
    warningBox.style.display = 'none';
    stopCamera();
});

toggleCameraBtn.addEventListener('click', () => {
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

    // Tạm dừng hiển thị khung hình tĩnh trên canvas
    canvasElement.style.display = 'block';
    cameraGuide.style.display = 'none';

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
function extractAndCalculateMetrics(landmarks, width, height) {
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
        symmetryScoreText
    };
}

// Vẽ các đường đo lường và điểm mốc phụ trợ lên khung hình
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

    // Vẽ các đường gióng tỷ lệ chiều dọc
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
    ctx.setLineDash([]);
    const linesY = [pts.foreheadTop.y, pts.glabella.y, pts.subnasale.y, pts.chinBottom.y];
    linesY.forEach(y => {
        ctx.beginPath();
        ctx.moveTo(pts.jawRight.x - 20, y);
        ctx.lineTo(pts.jawLeft.x + 20, y);
        ctx.stroke();
    });

    // Vẽ các điểm mốc quan trọng
    ctx.fillStyle = '#38bdf8';
    Object.values(pts).forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.fill();
    });
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

// Hiển thị kết quả phân tích có cấu trúc dưới dạng thẻ trực quan
function renderStructuredAnalysis(data) {
    const scoreVal = typeof data.harmonyScore === 'number' ? data.harmonyScore : 8.5;
    const scorePercent = Math.min(100, Math.max(0, scoreVal * 10));

    resultBody.innerHTML = `
        <!-- Thẻ điểm số và dáng khuôn mặt -->
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
                <span class="shape-value">${data.faceShape || 'Hài hòa cân đối'}</span>
            </div>
        </div>

        <!-- Nhận xét ưu điểm từng bộ phận -->
        <div class="parts-section">
            <h3 class="parts-section-title">Nhận Xét Ưu Điểm Từng Bộ Phận</h3>
            <div class="parts-grid">
                <div class="part-card">
                    <span class="part-title">Đôi Mắt và Ánh Nhìn</span>
                    <p class="part-desc">${data.featuresAnalysis.eyes || data.featuresAnalysis.keyFeatures || 'Ánh nhìn tươi sáng, đường nét thanh tú.'}</p>
                </div>
                <div class="part-card">
                    <span class="part-title">Sống Mũi và Tỷ Lệ</span>
                    <p class="part-desc">${data.featuresAnalysis.nose || 'Dáng mũi tự nhiên, tạo điểm nhấn cân xứng cho khuôn mặt.'}</p>
                </div>
                <div class="part-card">
                    <span class="part-title">Khuôn Miệng và Nụ Cười</span>
                    <p class="part-desc">${data.featuresAnalysis.lips || 'Đường viền môi duyên dáng, nụ cười rạng rỡ.'}</p>
                </div>
                <div class="part-card">
                    <span class="part-title">Xương Hàm và Cằm</span>
                    <p class="part-desc">${data.featuresAnalysis.jawline || 'Đường viền hàm thon gọn, cằm cân đối với tổng thể.'}</p>
                </div>
            </div>
        </div>

        <!-- Gợi ý định hình phong cách -->
        <div class="styling-section">
            <h3 class="parts-section-title">Gợi Ý Định Hình Phong Cách</h3>
            <div class="styling-grid">
                <div class="styling-card">
                    <span class="styling-card-title">Kiểu Tóc Phù Hợp</span>
                    <p class="styling-card-desc">${data.stylingAdvice.hairstyle}</p>
                </div>
                <div class="styling-card">
                    <span class="styling-card-title">Dáng Gọng Kính và Phụ Kiện</span>
                    <p class="styling-card-desc">${data.stylingAdvice.eyewear}</p>
                </div>
                <div class="styling-card">
                    <span class="styling-card-title">Phong Cách Chăm Sóc và Trang Điểm</span>
                    <p class="styling-card-desc">${data.stylingAdvice.makeupOrGrooming}</p>
                </div>
            </div>
        </div>

        <!-- Lời đúc kết diện mạo -->
        <div class="summary-card">
            <h4 class="summary-title">Lời Đúc Kết Diện Mạo</h4>
            <p class="summary-text">${data.summary}</p>
        </div>
    `;
    resultBody.style.display = 'block';
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
    currentFileBase64 = null;
    fileInput.value = '';
    imagePreview.src = '';
    previewWrapper.style.display = 'none';
    dropContent.style.display = 'flex';
    analyzeUploadBtn.disabled = true;
    resultSection.style.display = 'none';
    metricsContainer.style.display = 'none';
    warningBox.style.display = 'none';
    resultBody.innerHTML = '';
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
        return;
    } else if (avgBrightness > 245) {
        warningBox.textContent = 'Hình ảnh bị chói sáng hoặc dư sáng quá mức. Vui lòng điều chỉnh lại hướng nguồn sáng để các đường nét không bị mờ nhạt.';
        warningBox.style.display = 'block';
    }

    captureAnalyzeBtn.disabled = true;
    analyzeUploadBtn.disabled = true;

    resultSection.style.display = 'block';
    spinnerWrapper.style.display = 'flex';
    resultBody.style.display = 'none';
    resultBody.innerHTML = '';
    metricsContainer.style.display = 'none';

    // Bật hiệu ứng tia quét laser chờ xử lý
    startScanningAnimation(isFromCamera);

    let calculatedMetrics = null;

    // Trích xuất và kiểm tra xem có phát hiện mặt người không
    if (faceLandmarker) {
        try {
            const detections = faceLandmarker.detect(imageSourceElement);
            if (!detections || !detections.faceLandmarks || detections.faceLandmarks.length === 0) {
                stopScanningAnimation();
                spinnerWrapper.style.display = 'none';
                captureAnalyzeBtn.disabled = false;
                analyzeUploadBtn.disabled = false;

                warningBox.textContent = 'Không tìm thấy khuôn mặt trong hình ảnh. Vui lòng căn chỉnh lại góc nhìn thẳng vào ống kính và bảo đảm khuôn mặt không bị che khuất.';
                warningBox.style.display = 'block';
                return;
            }

            const landmarks = detections.faceLandmarks[0];
            const width = imageSourceElement.naturalWidth || imageSourceElement.videoWidth || imageSourceElement.width || 640;
            const height = imageSourceElement.naturalHeight || imageSourceElement.videoHeight || imageSourceElement.height || 480;

            calculatedMetrics = extractAndCalculateMetrics(landmarks, width, height);
            renderMetricsDashboard(calculatedMetrics);

            // Nếu nguồn là canvas của camera, vẽ các đường phụ trợ
            if (imageSourceElement === canvasElement) {
                drawLandmarksOverlay(calculatedMetrics, width, height);
            }
        } catch (landmarkErr) {
            console.warn('Lỗi trích xuất điểm mốc:', landmarkErr);
        }
    }

    // Thiết lập thời gian quét laser tối thiểu 2.5 giây để tăng trải nghiệm trực quan
    const minScanTimer = new Promise(resolve => setTimeout(resolve, 2500));

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

        // Đợi đồng thời cả cuộc gọi mạng và hiệu ứng tia quét
        const [resData] = await Promise.all([fetchPromise, minScanTimer]);

        if (resData.success && resData.data) {
            renderStructuredAnalysis(resData.data);
        } else {
            resultBody.innerHTML = `<div class="error-message">${resData.message || 'Không thể thực hiện đánh giá. Vui lòng kiểm tra lại cấu hình hệ thống.'}</div>`;
            resultBody.style.display = 'block';
        }
    } catch (err) {
        resultBody.innerHTML = '<div class="error-message">Không thể kết nối đến máy chủ xử lý. Vui lòng kiểm tra lại dịch vụ máy chủ.</div>';
        resultBody.style.display = 'block';
    } finally {
        stopScanningAnimation();
        spinnerWrapper.style.display = 'none';
        captureAnalyzeBtn.disabled = false;
        analyzeUploadBtn.disabled = false;
    }
}

// Khởi chạy ứng dụng
window.addEventListener('DOMContentLoaded', async () => {
    await initFaceLandmarker();
    startCamera();
});
