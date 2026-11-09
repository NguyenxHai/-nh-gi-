const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenAI, Type } = require('@google/genai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Phục vụ tệp tĩnh và ngăn trình duyệt lưu đệm tệp cũ
app.use(express.static(path.join(__dirname, '../frontend'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// Tạo kết quả phân tích thử nghiệm sinh động dựa trên số liệu hình học khi chưa cấu hình API Key
function generateFallbackAnalysis(metrics) {
  const sym = metrics?.overallSymmetry || 92;
  const eyeRatio = metrics?.eyeRatioPercent || 20;
  const foreheadPct = metrics?.foreheadPct || 33.3;
  const nosePct = metrics?.nosePct || 33.3;
  const chinPct = metrics?.chinPct || 33.3;
  const faceRatio = metrics?.faceRatio || 0.82;
  const eyeSlant = metrics?.eyeSlant || 0;
  const skinWarmth = metrics?.skinWarmth || 15;

  // Xác định dáng khuôn mặt dựa trên tỷ lệ thực tế
  let faceShape = 'Trái xoan thanh lịch';
  let hairstyles = [];
  let glasses = '';

  if (faceRatio > 0.86) {
    if (sym > 90) {
      faceShape = 'Tròn thanh tú';
      hairstyles = [
        'Tóc tỉa layer ôm nhẹ xương hàm giúp gương mặt trông thon gọn và thanh thoát hơn',
        'Tóc uốn sóng lơi nhẹ nhàng rẽ ngôi bay 6/4 tạo hiệu ứng kéo dài chiều dọc khuôn mặt',
        'Tóc lob ngang vai uốn cụp nhẹ phần đuôi tôn lên nét tươi sáng, trẻ trung'
      ];
      glasses = 'Gọng kính vuông hoặc gọng chữ nhật góc cạnh thanh mảnh giúp tạo sự góc cạnh cân đối';
    } else {
      faceShape = 'Vuông chữ điền cá tính';
      hairstyles = [
        'Tóc uốn gợn sóng bồng bềnh làm mềm mại các đường nét góc cạnh ở hai bên hàm',
        'Tóc mái bay uốn nhẹ buông lơi che bớt phần quai hàm vuông vức',
        'Tóc dài thẳng tỉa đuôi sole tạo cảm giác thanh nhã và tự nhiên'
      ];
      glasses = 'Gọng kính tròn hoặc gọng oval viền mỏng làm dịu đi góc hàm mạnh mẽ';
    }
  } else if (faceRatio < 0.77) {
    faceShape = 'Dài thanh nhã';
    hairstyles = [
      'Tóc ngắn ngang vai uốn phồng kết hợp mái thưa giúp rút ngắn chiều dài khuôn mặt',
      'Tóc xoăn sóng nước bồng bềnh hai bên tạo độ đầy đặn cho vùng gò má',
      'Tóc bob uốn cụp đuôi tạo vẻ ngoài hiện đại và cân đối tỷ lệ ba tầng mặt'
    ];
    glasses = 'Gọng kính bản to, gọng tròn oversize hoặc gọng phi công giúp mở rộng chiều ngang diện mạo';
  } else {
    faceShape = 'Trái xoan thanh lịch';
    hairstyles = [
      'Tóc layer nhiều tầng ôm nhẹ xương quai hàm giúp tôn vinh đường nét thanh thoát',
      'Tóc uốn sóng lơi nhẹ nhàng rẽ ngôi bay tạo cảm giác bồng bềnh và mềm mại cho khuôn mặt',
      'Tóc ngắn ngang vai mái thưa Hàn Quốc giúp vầng trán cân đối và làm nổi bật đôi mắt'
    ];
    glasses = 'Gọng kính mắt mèo thanh mảnh hoặc gọng oval kim loại bo tròn nhẹ để tôn vinh gò má và đôi mắt';
  }

  // Xác định dáng mắt dựa trên độ nghiêng đuôi mắt
  let eyeShape = 'Dáng mắt hạnh nhân thanh tú, đường viền mắt cân đối tự nhiên';
  if (eyeSlant < -1.2) {
    eyeShape = 'Dáng mắt phượng kiêu kỳ, đuôi mắt xếch nhẹ toát lên thần thái sắc sảo';
  } else if (eyeSlant > 1.2) {
    eyeShape = 'Dáng mắt cún tròn to, ánh nhìn trong sáng, hiền hòa và ấm áp';
  }

  // Xác định hệ động vật (Vibe Type) dựa trên sự kết hợp ngũ quan
  let vibe = 'Hệ Mèo - Sắc sảo, quyến rũ và cuốn hút';
  if (eyeSlant > 1.0 && faceRatio > 0.82) {
    vibe = 'Hệ Cún - Đáng yêu, tươi vui và thân thiện';
  } else if (eyeSlant < -1.0 && faceRatio < 0.80) {
    vibe = 'Hệ Cáo - Cá tính, sắc nét và thông minh';
  } else if (faceRatio < 0.77) {
    vibe = 'Hệ Hươu - Thanh tao, trong trẻo và thoát tục';
  } else if (eyeRatio > 21) {
    vibe = 'Hệ Thỏ - Dịu dàng, trong sáng và ngọt ngào';
  } else if (faceRatio > 0.88) {
    vibe = 'Hệ Gấu - Điềm đạm, ấm áp và đáng tin cậy';
  }

  // Đánh giá sắc tố cá nhân Personal Color
  let skinTone = 'Tone ấm (Warm Autumn) - Sắc da ấm áp, hài hòa với gam màu đất, cam ấm, be nhạt, nâu caramel';
  if (skinWarmth <= 10) {
    skinTone = 'Tone lạnh (Cool Summer) - Sắc da sáng trong thanh khiết, hài hòa với gam màu pastel, xanh navy, hồng tro';
  } else if (skinWarmth > 20) {
    skinTone = 'Tone ấm (Warm Spring) - Sắc da tươi sáng rạng rỡ, phù hợp với màu san hô, vàng bơ, cam đào';
  }

  // Điểm số hài hòa dao động thực tế theo độ đối xứng và độ cân đối
  const verticalVariance = Math.abs(33.3 - foreheadPct) + Math.abs(33.3 - nosePct) + Math.abs(33.3 - chinPct);
  const rawScore = 10 - (verticalVariance * 0.06) - ((100 - sym) * 0.05);
  const harmonyScore = Math.min(9.8, Math.max(8.0, Math.round(rawScore * 10) / 10));

  return {
    vibe_type: vibe,
    eye_shape: eyeShape,
    skin_tone: skinTone,
    recommended_hairstyles: hairstyles,
    recommended_glasses: glasses,
    faceShape: faceShape,
    harmonyScore: harmonyScore,
    featuresAnalysis: {
      eyes: `Đôi mắt có độ mở hài hòa, ${eyeShape.toLowerCase()}.`,
      nose: `Sống mũi có độ dài chiếm ${nosePct.toFixed(1)}% chiều dọc khuôn mặt, đường nét thẳng và tự nhiên.`,
      lips: 'Khuôn miệng duyên dáng, đường nét môi trên và môi dưới mềm mại, tạo nụ cười rạng rỡ.',
      jawline: `Đường viền hàm ${faceShape.toLowerCase()}, góc nghiêng tạo vẻ thanh thoát và hài hòa.`,
      verticalProportions: `Tỷ lệ ba tầng mặt: Trán ${foreheadPct.toFixed(1)}%, Mũi ${nosePct.toFixed(1)}%, Cằm ${chinPct.toFixed(1)}%, phân bổ rất cân đối theo nhân trắc học.`,
      horizontalProportions: `Độ rộng mắt chiếm ${eyeRatio.toFixed(1)}% bề ngang khuôn mặt, tiệm cận tiêu chuẩn ngũ nhãn chuẩn mực.`,
      symmetry: `Độ đối xứng hai bên đạt ${sym.toFixed(1)}%, hai nửa khuôn mặt có sự đồng điệu cao qua trục trung tâm.`
    },
    summary: 'Khuôn mặt sở hữu đường nét ngũ quan hài hòa và khí chất tự nhiên nổi bật. Hãy tự tin tôn vinh vẻ đẹp riêng thông qua phong cách tóc và phụ kiện phù hợp.'
  };
}

// Hàm xử lý phân tích khuôn mặt qua Gemini AI
async function handleFaceAnalysis(req, res) {
  let metrics = null;
  try {
    const { imageBase64, mimeType = 'image/jpeg', metrics: reqMetrics } = req.body;
    metrics = reqMetrics;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Hình ảnh không được để trống.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Nếu chưa cấu hình API Key, sử dụng bộ giải mã nhân trắc học sinh động để người dùng trải nghiệm ngay
    if (!apiKey) {
      const fallbackData = generateFallbackAnalysis(metrics);
      return res.json({
        success: true,
        vibe_type: fallbackData.vibe_type,
        eye_shape: fallbackData.eye_shape,
        skin_tone: fallbackData.skin_tone,
        recommended_hairstyles: fallbackData.recommended_hairstyles,
        recommended_glasses: fallbackData.recommended_glasses,
        data: fallbackData,
        isDemo: true,
        notice: 'Hệ thống đang hiển thị kết quả thử nghiệm theo thông số hình học. Hãy thêm khóa GEMINI_API_KEY vào tệp backend/.env để kích hoạt kết nối AI Gemini đầy đủ.'
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const ai = new GoogleGenAI({ apiKey });

    // Tổng hợp thông số đo đạc hình học từ điểm mốc
    let metricsContext = 'Không có thông số đo đạc hình học kèm theo.';
    if (metrics) {
      metricsContext = `
Dưới đây là các thông số hình học được đo đạc chính xác từ các điểm mốc trên khuôn mặt:
- Tỷ lệ ba phần chiều dọc (Trán : Mũi : Cằm): ${metrics.verticalRatioText || 'Không xác định'} (Tỷ lệ chuẩn mực tham chiếu là 1.0 : 1.0 : 1.0 hay 33.3% - 33.3% - 33.3%).
- Tỷ lệ năm phần chiều ngang: Độ rộng mắt chiếm ${metrics.horizontalEyeRatioText || 'Không xác định'} bề ngang khuôn mặt (Tỷ lệ tham chiếu theo quy tắc ngũ nhãn là xấp xỉ 20%).
- Độ đối xứng hai bên khuôn mặt: ${metrics.symmetryScoreText || 'Không xác định'}.
- Tỷ lệ chiều ngang / chiều dài mặt: ${metrics.faceRatio ? metrics.faceRatio.toFixed(2) : 'Không xác định'}.
`;
    }

    const promptText = `Dựa vào ảnh chụp và số liệu tỷ lệ đính kèm:
${metricsContext}

Hãy thực hiện các yêu cầu phân tích chuyên sâu sau:
1. Phân loại khuôn mặt này thuộc hệ động vật nào (vibe_type: ví dụ Hệ Mèo sắc sảo quyến rũ, Hệ Cún thân thiện ngọt ngào, Hệ Hươu thanh tao thoát tục, Hệ Cáo cá tính sắc nét, Hệ Thỏ trong trẻo dịu dàng...).
2. Xác định dáng mắt chủ đạo (eye_shape: ví dụ Dáng mắt hạnh nhân, Dáng mắt phượng kiêu kỳ, Dáng mắt cún tròn to hiền hòa...).
3. Đánh giá sắc tố da cá nhân Personal Color (skin_tone: Tone da ấm hay Tone da lạnh, thuộc bảng màu mùa nào như Xuân ấm, Hạ mát, Thu trầm, Đông lạnh và gam màu trang phục/trang điểm tôn da nhất).
4. Đề xuất đúng 3 kiểu tóc phù hợp nhất (recommended_hairstyles) để tôn vinh đường nét và khắc phục nhược điểm dáng mặt.
5. Đề xuất hình dáng gọng kính phù hợp nhất (recommended_glasses) để cân đối tỷ lệ khuôn mặt.
6. Đánh giá chi tiết ngũ quan (mắt, mũi, môi, hàm), độ hài hòa tổng thể (thang điểm 10) và lời đúc kết.

Quy định bắt buộc:
- Sử dụng tiếng Việt chuẩn mực, từ ngữ chuyên nghiệp, lịch sự, tôn trọng người dùng.
- Tuyệt đối không sử dụng bất kỳ biểu tượng cảm xúc (emoji hoặc icon) nào trong toàn bộ văn bản phản hồi.`;

    const generateConfig = {
      systemInstruction: 'Bạn là một Chuyên gia nhân trắc học, thẩm mỹ học và tư vấn phong cách chuyên nghiệp. Nhiệm vụ của bạn là đưa ra những nhận định chuẩn xác, khoa học, tinh tế và gợi ý phong cách tôn vinh vẻ đẹp tự nhiên của mỗi người.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vibe_type: {
            type: Type.STRING,
            description: 'Phân loại khuôn mặt theo hệ động vật kèm đặc trưng khí chất'
          },
          eye_shape: {
            type: Type.STRING,
            description: 'Dáng mắt chủ đạo của diện mạo'
          },
          skin_tone: {
            type: Type.STRING,
            description: 'Đánh giá sắc tố diện mạo cá nhân Personal Color (tone ấm/lạnh, mùa màu và gợi ý màu sắc)'
          },
          recommended_hairstyles: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING
            },
            description: 'Danh sách 3 kiểu tóc phù hợp nhất kèm lý do'
          },
          recommended_glasses: {
            type: Type.STRING,
            description: 'Hình dáng gọng kính mắt và phụ kiện phù hợp nhất'
          },
          faceShape: {
            type: Type.STRING,
            description: 'Hình dáng khuôn mặt chính xác (Trái xoan, Tròn, Vuông chữ điền, Trái tim, Kim cương, Dài...)'
          },
          harmonyScore: {
            type: Type.NUMBER,
            description: 'Điểm số độ hài hòa tổng thể trên thang điểm 10 (ví dụ: 8.5)'
          },
          featuresAnalysis: {
            type: Type.OBJECT,
            properties: {
              eyes: {
                type: Type.STRING,
                description: 'Nhận xét ưu điểm và thần thái của đôi mắt và ánh nhìn'
              },
              nose: {
                type: Type.STRING,
                description: 'Nhận xét ưu điểm về sống mũi, dáng mũi và tỷ lệ mũi'
              },
              lips: {
                type: Type.STRING,
                description: 'Nhận xét ưu điểm về khuôn miệng, dáng môi và nụ cười'
              },
              jawline: {
                type: Type.STRING,
                description: 'Nhận xét ưu điểm về xương hàm, độ thon gọn của cằm và góc hàm'
              },
              verticalProportions: {
                type: Type.STRING,
                description: 'Nhận xét chi tiết về tỷ lệ ba tầng mặt (trán, mũi, cằm) dựa trên số liệu đo đạc'
              },
              horizontalProportions: {
                type: Type.STRING,
                description: 'Nhận xét về tỷ lệ năm phần chiều ngang và khoảng cách hai mắt'
              },
              symmetry: {
                type: Type.STRING,
                description: 'Đánh giá mức độ đối xứng giữa nửa mặt bên trái và bên phải'
              }
            },
            required: ['eyes', 'nose', 'lips', 'jawline', 'verticalProportions', 'horizontalProportions', 'symmetry']
          },
          summary: {
            type: Type.STRING,
            description: 'Lời đúc kết tổng quan tinh tế, nhã nhặn và tích cực về diện mạo'
          }
        },
        required: [
          'vibe_type',
          'eye_shape',
          'skin_tone',
          'recommended_hairstyles',
          'recommended_glasses',
          'faceShape',
          'harmonyScore',
          'featuresAnalysis',
          'summary'
        ]
      }
    };

    let response;
    try {
      // Ưu tiên sử dụng model gemini-3.5-flash-lite tốc độ cao
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType
            }
          },
          promptText
        ],
        config: generateConfig
      });
    } catch (primaryErr) {
      console.warn('Chuyển đổi sang model kế tiếp do:', primaryErr.message);
      // Phương án dự phòng với gemini-3.8-flash
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType
            }
          },
          promptText
        ],
        config: generateConfig
      });
    }

    const parsedData = JSON.parse(response.text);

    return res.json({
      success: true,
      vibe_type: parsedData.vibe_type,
      eye_shape: parsedData.eye_shape,
      skin_tone: parsedData.skin_tone,
      recommended_hairstyles: parsedData.recommended_hairstyles,
      recommended_glasses: parsedData.recommended_glasses,
      data: parsedData,
      isDemo: false
    });
  } catch (error) {
    console.error('Lỗi khi gọi dịch vụ AI:', error.message);
    // Khi dịch vụ AI gặp sự cố mạng hoặc hạn ngạch, kích hoạt bộ giải mã hình học để luôn phản hồi kết quả
    const fallbackData = generateFallbackAnalysis(metrics);
    return res.json({
      success: true,
      vibe_type: fallbackData.vibe_type,
      eye_shape: fallbackData.eye_shape,
      skin_tone: fallbackData.skin_tone,
      recommended_hairstyles: fallbackData.recommended_hairstyles,
      recommended_glasses: fallbackData.recommended_glasses,
      data: fallbackData,
      isDemo: true,
      notice: 'Dịch vụ trí tuệ nhân tạo tạm thời bận. Hệ thống đã chuyển tiếp sang phân tích nhân trắc học hình học tức thì.'
    });
  }
}

// Tuyến đường API chính thức
app.post('/api/analyze', handleFaceAnalysis);

// Tuyến đường dự phòng tương thích ngược
app.post('/api/analyze-face', handleFaceAnalysis);

app.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});
