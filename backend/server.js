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
app.use(express.static(path.join(__dirname, '../frontend')));

// Hàm xử lý phân tích khuôn mặt qua Gemini 2.5 Flash
async function handleFaceAnalysis(req, res) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Khóa API chưa được cấu hình trên máy chủ.'
      });
    }

    const { imageBase64, mimeType = 'image/jpeg', metrics } = req.body;
    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Hình ảnh không được để trống.'
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
`;
    }

    const promptText = `Hãy nghiên cứu kỹ hình ảnh chân dung và các số liệu đo lường hình học sau:
${metricsContext}

Hãy tiến hành đánh giá nhân trắc học, độ hài hòa ngũ quan và tư vấn định hình phong cách cá nhân hóa.
Lưu ý quy định:
- Dùng tiếng Việt chuẩn mực, từ ngữ tinh tế, lịch sự, tôn trọng người dùng.
- Tuyệt đối không dùng bất kỳ biểu tượng cảm xúc (emoji hoặc icon) nào trong nội dung phản hồi.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType
          }
        },
        promptText
      ],
      config: {
        systemInstruction: 'Bạn là một Chuyên gia nhân trắc học và tư vấn phong cách chuyên nghiệp. Nhiệm vụ của bạn là đưa ra những nhận định thẩm mỹ khoa học, khách quan, tinh tế và gợi ý phong cách tôn vinh vẻ đẹp tự nhiên của mỗi người.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faceShape: {
              type: Type.STRING,
              description: 'Hình dáng khuôn mặt chính xác (ví dụ: Trái xoan, Tròn, Vuông chữ điền, Trái tim, Kim cương, Dài...)'
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
            stylingAdvice: {
              type: Type.OBJECT,
              properties: {
                hairstyle: {
                  type: Type.STRING,
                  description: 'Gợi ý kiểu tóc và độ dài tóc phù hợp nhất với dáng mặt và vầng trán'
                },
                eyewear: {
                  type: Type.STRING,
                  description: 'Gợi ý dáng gọng kính mắt và phụ kiện tôn đường nét ngũ quan'
                },
                makeupOrGrooming: {
                  type: Type.STRING,
                  description: 'Lời khuyên định hình phong cách trang điểm hoặc chăm sóc diện mạo'
                }
              },
              required: ['hairstyle', 'eyewear', 'makeupOrGrooming']
            },
            summary: {
              type: Type.STRING,
              description: 'Lời đúc kết tổng quan tinh tế, nhã nhặn và tích cực về diện mạo'
            }
          },
          required: ['faceShape', 'harmonyScore', 'featuresAnalysis', 'stylingAdvice', 'summary']
        }
      }
    });

    const parsedData = JSON.parse(response.text);

    return res.json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi trong quá trình xử lý hình ảnh.',
      error: error.message
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
