const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenAI, Type } = require('@google/genai');

// Nạp biến môi trường từ các vị trí khả dĩ
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
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

// Chuẩn hóa và phục hồi dấu tiếng Việt nếu phản hồi từ mô hình bị thiếu dấu
function restoreVietnameseAccents(text) {
  if (typeof text !== 'string') return text;
  let s = text.normalize('NFC');

  const replacements = [
    [/\bHe Meo\b/gi, 'Hệ Mèo'],
    [/\bHe Cun\b/gi, 'Hệ Cún'],
    [/\bHe Huou\b/gi, 'Hệ Hươu'],
    [/\bHe Cao\b/gi, 'Hệ Cáo'],
    [/\bHe Tho\b/gi, 'Hệ Thỏ'],
    [/\bHe Gau\b/gi, 'Hệ Gấu'],
    [/\bHe Chim Ung\b/gi, 'Hệ Chim Ưng'],
    [/\bTrai xoan\b/gi, 'Trái xoan'],
    [/\bMat tron\b/gi, 'Mặt tròn'],
    [/\bVuong chu dien\b/gi, 'Vuông chữ điền'],
    [/\bTrai tim\b/gi, 'Trái tim'],
    [/\bKim cuong\b/gi, 'Kim cương'],
    [/\bMat hanh nhan\b/gi, 'Mắt hạnh nhân'],
    [/\bMat phuong\b/gi, 'Mắt phượng'],
    [/\bMat cun\b/gi, 'Mắt cún'],
    [/\bMat mot mi\b/gi, 'Mắt một mí'],
    [/\bMat hai mi\b/gi, 'Mắt hai mí'],
    [/\bTone am\b/gi, 'Tone ấm'],
    [/\bTone lanh\b/gi, 'Tone lạnh'],
    [/\bDa am\b/gi, 'Da ấm'],
    [/\bDa lanh\b/gi, 'Da lạnh'],
    [/\bMua Xuan\b/gi, 'Mùa Xuân'],
    [/\bMua Ha\b/gi, 'Mùa Hạ'],
    [/\bMua Thu\b/gi, 'Mùa Thu'],
    [/\bMua Dong\b/gi, 'Mùa Đông'],
    [/\bKieu 1\b/gi, 'Kiểu 1'],
    [/\bKieu 2\b/gi, 'Kiểu 2'],
    [/\bKieu 3\b/gi, 'Kiểu 3'],
    [/\bKieu toc\b/gi, 'Kiểu tóc'],
    [/\bGong kinh\b/gi, 'Gọng kính'],
    [/\bNu cuoi\b/gi, 'Nụ cười'],
    [/\bKhuon mieng\b/gi, 'Khuôn miệng'],
    [/\bSong mui\b/gi, 'Sống mũi'],
    [/\bXuong ham\b/gi, 'Xương hàm'],
    [/\bThon gon\b/gi, 'Thon gọn'],
    [/\bCan doi\b/gi, 'Cân đối'],
    [/\bHai hoa\b/gi, 'Hài hòa'],
    [/\bThanh thoat\b/gi, 'Thanh thoát'],
    [/\bQuyen ru\b/gi, 'Quyến rũ'],
    [/\bSac sao\b/gi, 'Sắc sảo'],
    [/\bTuoi sang\b/gi, 'Tươi sáng'],
    [/\bTrong sang\b/gi, 'Trong sáng']
  ];

  for (const [re, rep] of replacements) {
    s = s.replace(re, rep);
  }
  return s;
}

function sanitizeAnalysisObject(obj) {
  if (typeof obj === 'string') {
    return restoreVietnameseAccents(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeAnalysisObject);
  }
  if (obj && typeof obj === 'object') {
    const res = {};
    for (const key of Object.keys(obj)) {
      res[key] = sanitizeAnalysisObject(obj[key]);
    }
    return res;
  }
  return obj;
}

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
  let harmonyScore = 8.5;
  if (metrics && typeof metrics.calculatedScore10 === 'number') {
    harmonyScore = metrics.calculatedScore10;
  } else {
    const verticalVariance = Math.abs(33.3 - foreheadPct) + Math.abs(33.3 - nosePct) + Math.abs(33.3 - chinPct);
    const rawScore = 10 - (verticalVariance * 0.06) - ((100 - sym) * 0.05);
    harmonyScore = Math.min(9.8, Math.max(8.0, Math.round(rawScore * 10) / 10));
  }

  // Đánh giá Thẩm mỹ Á Đông & Khí chất
  const isHighWeight = (eyeRatio > 20.5);
  const asianAestheticsData = {
    visualWeight: {
      category: isHighWeight ? 'Nùng nhan (Đậm nét)' : 'Đạm nhan (Thanh nhạt)',
      blankSpaceAnalysis: isHighWeight
        ? 'Ngũ quan chiếm tỷ lệ lớn, độ tương phản sắc sảo, diện tích lưu bạch ít tạo điểm nhấn thị giác tập trung và ấn tượng.'
        : 'Ngũ quan thanh tú phân bổ thoáng đãng, độ lưu bạch rộng mang lại cảm giác nhẹ nhàng, thanh thoát và trong trẻo chuẩn nét đẹp Á Đông.'
    },
    boneVsSoftTissue: {
      dominantType: faceRatio < 0.80 ? 'Mỹ nhân Cốt tướng' : 'Mỹ nhân Bì tướng',
      contourSmoothness: 'Đường viền từ thái dương qua gò má xuống hàm chuyển tiếp mượt mà, độ liên kết khung xương hài hòa, không bị gấp khúc.',
      fourHighsThreeLows: 'Cấu trúc Tứ Cao Tam Thấp đạt độ nổi khối 3D cân đối, trán và chóp mũi tạo góc nghiêng thanh tú, môi và cằm có độ cong lập thể chuẩn mực.'
    },
    visualAgeMatrix: {
      neotenyVsMaturity: foreheadPct > 34 ? '65% Nét trẻ thơ (Neoteny) - 35% Trưởng thành (Maturity)' : '35% Nét trẻ thơ (Neoteny) - 65% Trưởng thành (Maturity)',
      midfaceAndPhiltrum: `Tầng mặt giữa chiếm ${nosePct.toFixed(1)}% chiều dọc, nhân trung có tỷ lệ cân đối với cằm, duy trì sự hài hòa giữa nét tươi trẻ và quý phái.`
    },
    asianArchetype: {
      vibeTitle: foreheadPct > 34 ? 'Bạch Nguyệt Quang trong trẻo' : 'Thiên Kim Tài Phiệt thanh lịch',
      animalType: vibe.split(' - ')[0] || 'Hệ Mèo',
      detailedExplanation: `Sự kết hợp giữa ${eyeShape.toLowerCase()} và đường nét hàm ${faceShape.toLowerCase()} toát lên khí chất phương Đông thanh nhã và cuốn hút.`
    },
    tailoredAsianStyling: {
      makeupStyle: isHighWeight
        ? 'Gợi ý layout makeup phong cách Douyin hoặc Hồng Kông cổ điển sắc sảo, nhấn đậm eyeliner và màu môi'
        : 'Gợi ý layout makeup Clean Girl trong veo hoặc phong cách Hàn Quốc mỏng nhẹ, tôn làn da căng bóng tự nhiên',
      cranialHairTip: 'Gợi ý kiểu tóc uốn phồng chân tóc tự nhiên (High Cranial Top - Đầu bao mặt) giúp tạo cảm giác khuôn mặt nhỏ gọn và làm mềm đường viền hàm.'
    }
  };

  const slimmerSide = metrics?.slimmerSide || 'Bên Trái';
  const biggerEye = metrics?.biggerEyeSide || 'Mắt Phải';
  const detectedFlaws = metrics?.detectedFlaws || [];

  const defaultBestPhotoAngles = {
    bestSide: `Nghiêng 45° ${slimmerSide}`,
    cameraHeight: faceRatio > 0.85 
      ? 'Cao hơn tầm mắt 15°–20°, hướng nhẹ từ trên xuống để làm thon gọn đường viền hàm'
      : 'Ngang tầm mắt hoặc cao hơn nhẹ 10° để tôn sống mũi và chiều sâu đôi mắt',
    faceRotation: `Nghiêng mặt 45° sang phía đối diện để khoe trọn góc mặt ${slimmerSide.toLowerCase()} thanh tú`,
    expressionTip: 'Mỉm cười nhẹ thả lỏng cơ hàm, ánh mắt hướng tự nhiên vào ống kính',
    cameraAngleGuide: faceRatio > 0.85 
      ? 'Đặt camera cao hơn tầm mắt 15-20 độ, nghiêng mặt 45 độ về phía góc mặt thon gọn và hơi hạ nhẹ cằm để tạo hiệu ứng đường viền hàm thanh thoát V-line.'
      : 'Đặt camera ngang tầm mắt hoặc chếch nhẹ 10-15 độ, chụp góc nghiêng 45 độ để tôn sống mũi và chiều sâu đôi mắt.',
    poseAndExpressionTip: 'Áp dụng nụ cười mỉm nhẹ thả lỏng cơ hàm, đánh ánh sáng nghiêng 45 độ từ phía trước để tạo khối nổi bật cho gò má và sống mũi.'
  };

  const defaultFlawsAndFixes = [
    {
      flawName: detectedFlaws[0] ? detectedFlaws[0].split(' (')[0] : 'Đường viền xương hàm có độ lệch nhẹ',
      observation: `Khung xương hàm hai bên có sự chênh lệch tự nhiên nhẹ, góc hàm ${slimmerSide.toLowerCase()} thanh mảnh hơn phía đối diện.`,
      quickFix: 'Ưu tiên chụp góc nghiêng 3/4 tôn bên mặt thon gọn, kết hợp tóc rẽ ngôi hoặc mái bay buông lơi che nhẹ góc hàm còn lại.'
    },
    {
      flawName: nosePct > 34 ? 'Tầng mặt giữa hơi dài' : 'Khoảng cách giữa hai mắt cần điểm nhấn',
      observation: nosePct > 34 
        ? 'Tỷ lệ sống mũi chiếm diện tích dọc lớn, khiến khuôn mặt mang nét chững chạc hơn.'
        : 'Khoảng cách hai đầu mắt cần điều tiết nhẹ bằng kỹ thuật tạo khối để đôi mắt có chiều sâu hơn.',
      quickFix: nosePct > 34
        ? 'Tạo khối ngang ở đầu mũi và dùng phấn má tán ngang gò má để rút ngắn trục dọc thị giác.'
        : 'Nhấn sáng nhẹ ở khóe mắt trong và chuốt mascara tập trung ở đuôi mắt để mở rộng ánh nhìn.'
    }
  ];

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
      horizontalProportions: `Đ度 rộng mắt chiếm ${eyeRatio.toFixed(1)}% bề ngang khuôn mặt, tiệm cận tiêu chuẩn ngũ nhãn chuẩn mực.`,
      symmetry: `Độ đối xứng hai bên đạt ${sym.toFixed(1)}%, hai nửa khuôn mặt có sự đồng điệu cao qua trục trung tâm.`
    },
    expertPanel: {
      anthropologist: {
        expertTitle: 'Chuyên gia Nhân trắc học & Tỷ lệ vàng',
        focusBadge: 'Nhân trắc học & Khung xương',
        analysis: `Cấu trúc khuôn mặt có tỷ lệ ba tầng đạt mức ${foreheadPct.toFixed(1)}% : ${nosePct.toFixed(1)}% : ${chinPct.toFixed(1)}%, độ đối xứng hai bên trục đạt ${sym.toFixed(1)}%. Khung xương có độ cân bằng tốt giữa chiều ngang và chiều dọc.`,
        keyPoint: 'Khung xương vững chãi, các chỉ số nhân trắc học tiệm cận chuẩn mực cân đối.'
      },
      aesthetician: {
        expertTitle: 'Giám đốc Nghệ thuật & Sắc tố Diện mạo',
        focusBadge: 'Sắc thái & Khí chất',
        analysis: `Ngũ quan toát lên năng lượng thuộc ${vibe.toLowerCase()}. Đôi mắt có hồn và đường nét tươi sáng, làn da hài hòa với ${skinTone.toLowerCase()}.`,
        keyPoint: 'Thần thái tự nhiên, đường nét ngũ quan có sức hút riêng biệt.'
      },
      stylist: {
        expertTitle: 'Chuyên gia Tạo hình & Định hình Phong cách',
        focusBadge: 'Tạo hình & Ứng dụng',
        analysis: `Với khuôn mặt ${faceShape.toLowerCase()}, chiến lược tạo mẫu tối ưu là tập trung vào các đường sóng nhẹ hoặc tỉa tầng để làm nổi bật xương gò má và đôi mắt, kết hợp ${glasses.toLowerCase()}.`,
        keyPoint: 'Ưu tiên các kiểu tóc có độ phồng tự nhiên để tôn vinh trọn vẹn đường nét.'
      },
      debateDiscussion: 'Hội đồng chuyên môn nhận định: Chuyên gia nhân trắc học đánh giá cao sự cân đối của khung xương trục giữa. Giám đốc nghệ thuật nhấn mạnh sức hút từ thần thái đôi mắt và sắc da tự nhiên. Chuyên gia tạo hình đề xuất các giải pháp tóc và kính mắt nhằm điều tiết tỷ lệ hài hòa nhất.',
      consensusVerdict: 'Cả ba chuyên gia thống nhất rằng khuôn mặt sở hữu nền tảng nhân trắc học vững vàng cùng khí chất đặc trưng. Việc định hình kiểu tóc và phụ kiện phù hợp sẽ giúp tôn vinh trọn vẹn vẻ đẹp riêng.'
    },
    advancedAesthetics: {
      anthropometrics: {
        midfaceRatioAnalysis: metrics?.midfaceRatioText || 'Tầng giữa có tỷ lệ xấp xỉ 33.3%, phân bổ cân đối theo chuẩn mực giải phẫu.',
        canthalTiltAnalysis: metrics?.canthalTiltDesc || 'Độ nghiêng trục mắt ở mức thăng bằng tự nhiên, ánh nhìn hài hòa.',
        fwhrAnalysis: metrics?.fwhrText || '1.85 (Khung mặt có tỷ lệ bề ngang cân đối chuẩn mực).',
        jawAngleAnalysis: `Đường viền xương hàm ${faceShape.toLowerCase()}, độ mở góc hàm thanh thoát, cân xứng với tỷ lệ ngũ quan.`
      },
      visualWeight: {
        category: metrics?.visualWeightCategory || (eyeRatio > 21 ? 'High Visual Weight (Mặt Đậm Nét)' : 'Low Visual Weight (Mặt Thanh Nhạt)'),
        description: metrics?.visualWeightDesc || 'Ngũ quan phân bổ hài hòa trên khuôn mặt, tỷ lệ giữa các điểm nhấn và khoảng trống đạt độ cân bằng tự nhiên.',
        makeupStylingTip: metrics?.visualWeightStyling || 'Lựa chọn layout trang điểm nhẹ nhàng trong trẻo hoặc nhấn son ấm để tôn vẻ đẹp tự nhiên.'
      },
      fourHighsThreeLows: {
        scoreText: metrics?.fourHighsThreeLowsScore || 'Độ nổi khối 3D hài hòa theo nét đẹp tự nhiên',
        description: metrics?.fourHighsThreeLowsDesc || 'Cấu trúc Tứ Cao Tam Thấp có sự liên kết mượt mà giữa các điểm nhô trán, chóp mũi, môi và cằm, tạo góc nghiêng thanh thoát.'
      },
      visualAge: {
        tendency: metrics?.visualAgeTendency || (foreheadPct > 34 ? 'Thiên hướng Trẻ Thơ Thanh Thuần (Neoteny)' : 'Thiên hướng Trưởng Thành Quý Phái (Maturity)'),
        description: metrics?.visualAgeDesc || 'Tỷ lệ các tầng mặt cân đối tạo nên diện mạo vừa giữ được nét thanh xuân tươi tắn vừa mang phong thái chững chạc, cuốn hút.'
      }
    },
    asianAesthetics: asianAestheticsData,
    visualWeight: asianAestheticsData.visualWeight,
    boneVsSoftTissue: asianAestheticsData.boneVsSoftTissue,
    visualAgeMatrix: asianAestheticsData.visualAgeMatrix,
    asianArchetype: asianAestheticsData.asianArchetype,
    tailoredAsianStyling: asianAestheticsData.tailoredAsianStyling,
    bestPhotoAngles: defaultBestPhotoAngles,
    flawsAndFixes: defaultFlawsAndFixes,
    summary: 'Khuôn mặt sở hữu đường nét ngũ quan hài hòa và khí chất tự nhiên nổi bật. Hãy tự tin tôn vinh vẻ đẹp riêng thông qua phong cách tóc và phụ kiện phù hợp.'
  };
}

// Hàm xử lý phân tích khuôn mặt qua Gemini AI
async function handleFaceAnalysis(req, res) {
  let metrics = null;
  try {
    const { 
      imageBase64, 
      mimeType = 'image/jpeg', 
      metrics: reqMetrics,
      focusMode = 'comprehensive',
      genderStyle = 'unisex'
    } = req.body;
    metrics = reqMetrics;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Hình ảnh không được để trống.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Kiểm tra khóa xác thực
    if (!apiKey) {
      console.warn('Cảnh báo: Chưa cấu hình khóa xác thực cho mô hình.');
      const fallbackData = generateFallbackAnalysis(metrics);
      return res.json({
        success: true,
        vibe_type: fallbackData.vibe_type,
        eye_shape: fallbackData.eye_shape,
        skin_tone: fallbackData.skin_tone,
        recommended_hairstyles: fallbackData.recommended_hairstyles,
        recommended_glasses: fallbackData.recommended_glasses,
        expertPanel: fallbackData.expertPanel,
        advancedAesthetics: fallbackData.advancedAesthetics,
        asianAesthetics: fallbackData.asianAesthetics,
        visualWeight: fallbackData.visualWeight,
        boneVsSoftTissue: fallbackData.boneVsSoftTissue,
        visualAgeMatrix: fallbackData.visualAgeMatrix,
        asianArchetype: fallbackData.asianArchetype,
        tailoredAsianStyling: fallbackData.tailoredAsianStyling,
        bestPhotoAngles: fallbackData.bestPhotoAngles,
        flawsAndFixes: fallbackData.flawsAndFixes,
        data: fallbackData,
        isDemo: true,
        notice: 'Hệ thống đang hiển thị kết quả thử nghiệm theo thông số hình học. Hãy cấu hình khóa xác thực để kích hoạt trí tuệ nhân tạo.'
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const ai = new GoogleGenAI({ apiKey });

    // Tổng hợp thông số đo đạc hình học từ điểm mốc
    let metricsContext = 'Không có thông số đo đạc hình học kèm theo.';
    let scoreDirectives = '';
    if (metrics) {
      const score100Text = metrics.calculatedScore100 ? `${metrics.calculatedScore100.toFixed(1)}/100` : '85.0/100';
      const score10Val = typeof metrics.calculatedScore10 === 'number' ? metrics.calculatedScore10 : 8.5;

      const canthalInfo = metrics.canthalTiltClinical || (metrics.canthalTiltType ? `Độ nghiêng trục mắt: ${metrics.canthalTiltType} (${metrics.canthalTiltDesc || ''})` : 'Không xác định');
      const visualWeightInfo = metrics.visualWeightClinical || (metrics.visualWeightCategory ? `Trọng lượng thị giác: ${metrics.visualWeightCategory} (${metrics.visualWeightDesc || ''})` : 'Không xác định');
      const boneInfo = metrics.boneStructureClinical || (metrics.fwhrText ? `Tương quan Cốt tướng vs Bì tướng: FWHR ${metrics.fwhrText}` : 'Không xác định');
      const midfaceInfo = metrics.midfaceClinical || (metrics.midfaceRatioText ? `Tỷ lệ tầng mặt giữa: ${metrics.midfaceRatioText}` : 'Không xác định');
      const visualAgeInfo = metrics.visualAgeClinical || (metrics.visualAgeTendency ? `Độ tuổi thị giác: ${metrics.visualAgeTendency}` : 'Không xác định');
      const fourHighsInfo = metrics.fourHighsClinical || (metrics.fourHighsThreeLowsScore ? `Tứ Cao Tam Thấp 3D: ${metrics.fourHighsThreeLowsScore}` : 'Không xác định');

      const anglesInfo = metrics.anglesAndFlaws || {};
      const flawsListText = Array.isArray(metrics.detectedFlaws) && metrics.detectedFlaws.length 
        ? metrics.detectedFlaws.map(f => `- ${f}`).join('\n   ')
        : (Array.isArray(anglesInfo.detectedFlaws) && anglesInfo.detectedFlaws.length 
          ? anglesInfo.detectedFlaws.map(f => `- ${f}`).join('\n   ') 
          : '- Các tỷ lệ cơ bản khá cân đối');

      metricsContext = `
DƯỚI ĐÂY LÀ KẾT QUẢ ĐO ĐẠC HÌNH HỌC VÀ CÁC NHÃN KẾT LUẬN GIẢI PHẪU LÂM SÀNG CHÍNH XÁC (từ hệ tọa độ 3 chiều MediaPipe):
1. TRỤC MẮT & KHÍ CHẤT:
   - ${canthalInfo}
2. TRỌNG LƯỢNG THỊ GIÁC & ĐỘ LƯU BẠCH (VISUAL WEIGHT):
   - ${visualWeightInfo}
3. CỐT TƯỚNG VS BÌ TƯỚNG & KHUNG XƯƠNG:
   - ${boneInfo}
   - Tỷ lệ FWHR (Bề ngang gò má / Chiều cao ngũ quan): ${metrics.fwhrText || 'Không xác định'}
   - Tỷ lệ ngang/dọc khuôn mặt: ${metrics.faceRatio ? metrics.faceRatio.toFixed(2) : 'Không xác định'}
4. TẦNG MẶT GIỮA & NHÂN TRUNG:
   - ${midfaceInfo}
5. MA TRẬN ĐỘ TUỔI THỊ GIÁC (NEOTENY VS MATURITY):
   - ${visualAgeInfo}
6. ĐỘ NỔI KHỐI TỨ CAO - TAM THẤP 3D:
   - ${fourHighsInfo}
7. CÁC TỶ LỆ NHÂN TRẮC HỌC CƠ BẢN:
   - Tỷ lệ ba phần chiều dọc (Trán : Mũi : Cằm): ${metrics.verticalRatioText || 'Không xác định'}
   - Tỷ lệ năm phần chiều ngang (Ngũ nhãn): Độ rộng mắt chiếm ${metrics.horizontalEyeRatioText || 'Không xác định'}
   - Độ đối xứng hai bên trục giữa: ${metrics.symmetryScoreText || 'Không xác định'}
   - Góc xoay đầu (Head Pose): ${metrics.headPoseText || 'Thẳng đứng chuẩn hóa'}
   - Điểm cân đối hài hòa máy đo được: ${score100Text} (tương đương ${score10Val.toFixed(1)}/10).
8. THÔNG SỐ BẤT ĐỐI XỨNG TRÁI/PHẢI & ĐIỂM LỆCH CHUẨN THỰC TẾ:
   - Bên mặt có xương hàm thon gọn hơn: ${metrics.slimmerSide || anglesInfo.slimmerSide || 'Bên Trái'} (Chênh lệch bề ngang hàm: ${metrics.jawDiffPercent || anglesInfo.jawDiffPercent || '0%'})
   - Bên mắt có độ mở to hơn: ${metrics.biggerEyeSide || anglesInfo.biggerEyeSide || 'Mắt Phải'}
   - Độ nhô sống mũi không gian 3D: ${metrics.noseProjectionZ || anglesInfo.noseProjectionZ || '0.120'}
   - Các điểm lệch chuẩn đo được:
   ${flawsListText}
`;

      scoreDirectives = `
MỆNH LỆNH BẮT BUỘC VỀ ĐIỂM CÂN ĐỐI (HARMONY SCORE) VÀ KẾT LUẬN GIẢI PHẪU:
1. ĐIỂM CÂN ĐỐI: Điểm cân đối của người này đã được máy đo chính xác là ${score100Text} (tương đương ${score10Val.toFixed(1)}/10). Hãy dùng đúng con số ${score10Val.toFixed(1)} này cho trường harmonyScore trong JSON trả về và giải thích nguyên nhân dựa trên các số liệu thực tế đó, TUYỆT ĐỐI KHÔNG TỰ CHẤM HOẶC BỊA RA MỘT ĐIỂM SỐ KHÁC.
2. TIẾP NHẬN KẾT LUẬN GIẢI PHẪU LÂM SÀNG CÓ SẴN: Các kết luận giải phẫu trên (như Độ nghiêng trục mắt, Nùng Nhan vs Đạm Nhan, Cốt tướng vs Bì tướng, Ma trận Neoteny vs Maturity) ĐÃ ĐƯỢC THUẬT TOÁN ĐO ĐẠC VÀ ĐƯA RA KẾT LUẬN CHUẨN XÁC. Bạn KHÔNG cần phải suy luận lại từ con số thô. Hãy dùng trực tiếp các kết luận này để tập trung 100% năng lực vào việc:
   - Mô tả thần thái diện mạo, khí chất ngũ quan Á Đông sâu sắc, cuốn hút.
   - Tư vấn chiến lược Styling kiểu tóc (High Cranial Top - Đầu bao mặt), dáng gọng kính và layout trang điểm tôn nét đẹp riêng biệt.
3. PHÂN TÍCH GÓC MẶT ĐẸP & ĐIỂM LỆCH CHUẨN: Dựa trên thông số bất đối xứng Trái/Phải và danh sách các điểm lệch chuẩn đo đạc thực tế, hãy chỉ ra thẳng thắn nhưng lịch sự 2-3 điểm chưa hoàn hảo (về khung xương, tỷ lệ mắt/mũi/nhân trung/cằm hoặc mô mềm) kèm hướng dẫn góc chụp ăn ảnh nhất và cách dùng tóc, makeup, phụ kiện để khắc phục ngay lập tức. Tuyệt đối không khen chung chung hoặc né tránh.
`;
    }

    // Định hướng phong cách và trọng tâm phân tích từ người dùng
    let preferenceContext = '';

    if (genderStyle === 'male') {
      preferenceContext += '\n- ĐỊNH HƯỚNG PHONG CÁCH: NAM GIỚI. Toàn bộ tư vấn kiểu tóc (như undercut, side part, layer nam, two-block, pompadour...), dáng kính và phong cách định hình diện mạo phải phù hợp chuẩn mực với nam giới, toát lên sự nam tính, lịch lãm hoặc mạnh mẽ.';
    } else if (genderStyle === 'female') {
      preferenceContext += '\n- ĐỊNH HƯỚNG PHONG CÁCH: NỮ GIỚI. Toàn bộ tư vấn kiểu tóc (như layer uốn sóng, lob ngang vai, mái bay, xoăn lơi, bob cụp...), sắc tố trang điểm và gọng kính phải chuẩn mực cho nữ giới, tôn vinh nét nữ tính, thanh lịch, mềm mại hoặc quyến rũ.';
    } else {
      preferenceContext += '\n- ĐỊNH HƯỚNG PHONG CÁCH: UNISEX (TRUNG TÍNH / TỰ NHIÊN). Các đề xuất tạo hình mang tính ứng dụng cao, linh hoạt, hiện đại và tôn nét đẹp tự nhiên.';
    }

    if (focusMode === 'color_makeup') {
      preferenceContext += '\n- TRỌNG TÂM PHÂN TÍCH ƯU TIÊN: PERSONAL COLOR & MAKEUP. Ở mục skin_tone, featuresAnalysis và summary, hãy phân tích thật kỹ về undertone, độ sáng của da, độ tương phản ngũ quan; chỉ định cụ thể các gam màu trang phục nên mặc, gam màu nên tránh, màu son và phong cách trang điểm tôn da nhất.';
    } else if (focusMode === 'hair_glasses') {
      preferenceContext += '\n- TRỌNG TÂM PHÂN TÍCH ƯU TIÊN: TƯ VẤN KIỂU TÓC & KÍNH MẮT CHUYÊN SÂU. Ở mục recommended_hairstyles và recommended_glasses, hãy phân tích chi tiết cấu trúc xương hàm, gò má và vầng trán; đưa ra 3 kiểu tóc tối ưu từng góc cạnh kèm lý do cụ thể, cùng dáng và chất liệu kính mắt hài hòa nhất.';
    } else if (focusMode === 'anthropometry') {
      preferenceContext += '\n- TRỌNG TÂM PHÂN TÍCH ƯU TIÊN: NHÂN TRẮC HỌC CHUYÊN SÂU & TỶ LỆ VÀNG. Ở mục featuresAnalysis và summary, hãy tập trung phân tích khoa học dựa trên các số liệu đo đạc: tỷ lệ ba tầng mặt (trán - mũi - cằm), ngũ nhãn ngang, trục đối xứng và tỷ lệ vàng hình học, phân tích ưu thế cấu trúc xương mặt một cách khoa học và thuyết phục.';
    } else {
      preferenceContext += '\n- TRỌNG TÂM PHÂN TÍCH: TOÀN DIỆN. Đánh giá cân bằng, toàn diện giữa nhân trắc học, tỷ lệ vàng, sắc tố diện mạo và tư vấn phong cách.';
    }

    const promptText = `Bạn hãy quan sát thật kỹ bức ảnh chân dung cụ thể này (nhận diện rõ giới tính, độ tuổi ước tính, chi tiết ngũ quan, khung xương, ánh mắt, nụ cười và sắc da thực tế) kết hợp với số liệu đo đạc và yêu cầu tùy biến:
${metricsContext}
${preferenceContext}
${scoreDirectives}

YÊU CẦU PHÂN TÍCH RIÊNG BIỆT VÀ ĐỘC BẢN CHO BỨC ẢNH NÀY (TUYỆT ĐỐI KHÔNG DÙNG VĂN MẪU HOẶC NỘI DUNG LẶP LẠI):
1. Hệ động vật diện mạo (vibe_type): Quan sát thần thái và nét mặt trong ảnh để phân loại chính xác vào hệ khí chất động vật phù hợp (ví dụ: Hệ Mèo kiêu kỳ sắc sảo, Hệ Cún ngọt ngào thân thiện, Hệ Cáo thông minh cuốn hút, Hệ Hươu thanh thuần thoát tục, Hệ Thỏ trong trẻo dịu dàng, Hệ Sói bí ẩn cá tính, Hệ Báo sắc bén mạnh mẽ, Hệ Gấu ấm áp vững chãi...). Nêu rõ lý do cụ thể vì sao đường nét của gương mặt này tạo nên khí chất đó.
2. Dáng mắt chủ đạo (eye_shape): Nhận xét chính xác dáng mắt trong ảnh (mắt hạnh nhân, mắt phượng, mắt cún tròn, mắt một mí cá tính, mắt hai mí sâu, đuôi mắt xếch hoặc đuôi mắt cụp, ánh nhìn tươi sáng hay sâu lắng).
3. Sắc tố da cá nhân Personal Color (skin_tone): Nhìn màu da, sắc tố môi, màu mắt và tóc trong ảnh để xác định tone ấm (Warm Spring / Warm Autumn) hay tone lạnh (Cool Summer / Cool Winter), đề xuất cụ thể các gam màu trang phục tôn da nhất.
4. Đề xuất đúng 3 kiểu tóc phù hợp nhất (recommended_hairstyles): Gợi ý 3 kiểu tóc chuẩn xác phù hợp với giới tính và đường nét khuôn mặt của người trong ảnh, nêu rõ lý do kiểu tóc đó giúp tôn ưu điểm hoặc cân đối dáng mặt.
5. Đề xuất hình dáng gọng kính phù hợp (recommended_glasses): Gợi ý dáng gọng kính (oval, vuông, chữ nhật, mắt mèo, tròn thanh mảnh, gọng phi công...) phù hợp nhất với gò má và xương hàm trong ảnh.
6. Đánh giá chi tiết ngũ quan (featuresAnalysis):
   - eyes: Nhận xét cụ thể ưu điểm và thần thái đôi mắt của người trong ảnh.
   - nose: Nhận xét dáng mũi, sống mũi và tỷ lệ mũi của người trong ảnh.
   - lips: Nhận xét khuôn miệng, dáng môi và nụ cười của người trong ảnh.
   - jawline: Nhận xét đường viền xương hàm và độ thon gọn cằm của người trong ảnh.
   - verticalProportions: Nhận xét tỷ lệ ba tầng mặt (trán, mũi, cằm) theo số liệu đo đạc thực tế.
   - horizontalProportions: Nhận xét tỷ lệ bề ngang và khoảng cách hai mắt theo số liệu thực tế.
   - symmetry: Nhận xét mức độ cân xứng hai bên mặt theo số liệu thực tế.
7. Lời đúc kết diện mạo (summary): Đúc kết 2-3 câu tinh tế, tôn vinh nét đẹp riêng biệt và sức hút tự nhiên của người trong ảnh.
8. Mô phỏng 3 góc nhìn chuyên môn và cuộc tranh luận của hội đồng thẩm định (expertPanel):
   - Đóng vai 3 chuyên gia đầu ngành cùng thẩm định bức ảnh này:
     + Chuyên gia Nhân trắc học & Tỷ lệ vàng (anthropologist): Phân tích cấu trúc khung xương, tỷ lệ ba tầng dọc, ngũ nhãn ngang và độ đối xứng hình học.
     + Giám đốc Nghệ thuật & Sắc tố Diện mạo (aesthetician): Đánh giá thần thái ngũ quan, hệ khí chất vibe động vật, sắc thái da Personal Color và sức hút thị giác.
     + Chuyên gia Tạo hình & Định hình Phong cách (stylist): Đưa ra chiến lược tối ưu hóa đường nét qua kiểu tóc, phom gọng kính và phong cách tạo hình.
   - Cuộc đối thoại tranh luận của hội đồng (debateDiscussion): Mô phỏng cuộc đối thoại ngắn, sắc bén giữa 3 chuyên gia (mỗi chuyên gia nêu nhận xét, phản biện hoặc bổ trợ góc nhìn cho nhau trước khi thống nhất).
   - Kết luận thống nhất của hội đồng (consensusVerdict): Đúc kết chung có tính đồng thuận cao nhất của cả 3 chuyên gia về diện mạo này.
9. Đánh giá Nhân trắc học & Thẩm mỹ chuyên sâu (advancedAesthetics) qua 3 lăng kính chuyên môn:
   - Lăng kính 1: Giải phẫu & Tỷ lệ học (anthropometrics): Phân tích chi tiết Midface ratio (tỷ lệ tầng mặt giữa), Canthal Tilt (độ nghiêng trục mắt Dương/Âm/Ngang), FWHR, độ mở góc hàm và tỷ lệ 1/3, 1/5.
   - Lăng kính 2: Thẩm mỹ Á Đông & Trọng lượng thị giác (visualWeight - 濃顔 vs 淡顔): Xác định khuôn mặt thuộc nhóm High Visual Weight (Ngũ quan đậm, to, sắc nét, ít khoảng trống -> hợp phong cách Glam, Tây, cổ điển) hay Low Visual Weight (Ngũ quan thanh mảnh, nhiều khoảng trắng, mềm mại -> hợp phong cách Clean Girl, Bạch nguyệt quang, Hàn Quốc nhẹ nhàng) hay cân bằng; kèm phân tích độ tuổi thị giác (Neoteny/Trẻ thơ vs Maturity/Trưởng thành) và độ nổi khối 3D Tứ Cao Tam Thấp.
   - Lăng kính 3: Chuyên gia Định hình Phong cách (styling & makeup): Dựa chính xác vào trọng lượng thị giác và khuyết điểm tỷ lệ để tư vấn kiểu tóc (cụ thể phần mái, độ phồng), dáng kính, layout trang điểm và bảng màu HEX tôn da.
10. Đánh giá Hệ thống Thẩm mỹ Á Đông & Khí chất Diện mạo chuyên sâu (asianAesthetics):
    - visualWeight: Xác định Nùng nhan (Đậm nét) hoặc Đạm nhan (Thanh nhạt); phân tích chi tiết độ lưu bạch (khoảng trống trên mặt) và độ tương phản ngũ quan.
    - boneVsSoftTissue: Đánh giá thiên về Mỹ nhân Cốt tướng, Bì tướng hay Cân bằng; đánh giá độ mượt đường viền từ thái dương qua gò má xuống hàm; đánh giá độ nổi khối 3D Tứ Cao - Tam Thấp.
    - visualAgeMatrix: Tỷ lệ phần trăm Nét trẻ thơ (Neoteny) vs Trưởng thành (Maturity); nhận xét chiều dài tầng mặt giữa và nhân trung.
    - asianArchetype: vibeTitle (ví dụ: Bạch Nguyệt Quang, Thuần Dục, Thiên Kim Tài Phiệt, Minh Tinh Hồng Kông...); animalType (Hệ Mèo, Cáo, Cún, Hươu, Thỏ, Cá, hoặc Rắn); detailedExplanation (giải thích vì sao ngũ quan tạo nên khí chất này).
    - tailoredAsianStyling: makeupStyle (gợi ý layout makeup Douyin, Clean Girl, Hàn Quốc trong veo, Hồng Kông cổ điển... phù hợp với Visual Weight); cranialHairTip (gợi ý kiểu tóc giúp tạo hiệu ứng Đầu bao mặt High Cranial Top và che khuyết điểm viền hàm).
11. Phân tích Bí kíp góc máy & Bản đồ tinh chỉnh diện mạo (bestPhotoAngles & flawsAndFixes):
    - bestPhotoAngles:
      + bestSide: Nhãn góc thần thánh ngắn gọn, nổi bật (ví dụ: "Nghiêng 45° Bên Trái", "Nghiêng 30° Bên Phải", "Trực diện chếch nhẹ").
      + cameraHeight: Hướng dẫn ngắn gọn về độ cao camera (ví dụ: "Cao hơn tầm mắt 15°–20°, hướng nhẹ từ trên xuống").
      + faceRotation: Hướng dẫn ngắn gọn về góc xoay mặt (ví dụ: "Nghiêng mặt 45° sang phải để khoe trọn góc mặt trái thon gọn").
      + expressionTip: Hướng dẫn ngắn gọn về biểu cảm và ánh sáng (ví dụ: "Mỉm cười thả lỏng cơ hàm, ánh mắt nhìn tự nhiên vào ống kính").
      + cameraAngleGuide: Tóm tắt hướng dẫn cách đặt máy ảnh tổng thể.
      + poseAndExpressionTip: Mẹo biểu cảm tổng thể khi chụp ảnh.
    - flawsAndFixes: Bản đồ tinh chỉnh diện mạo (Optimization Map), chỉ ra 2 đến 3 điểm cần tinh chỉnh theo cặp đối xứng (Quan sát và Giải pháp tức thì):
      + flawName: Tên điểm cần tinh chỉnh (ví dụ: "Thái dương hơi hóp", "Tầng mặt giữa hơi dài", "Góc hàm bất đối xứng nhẹ").
      + observation: Quan sát khách quan vị trí và đặc điểm (ví dụ: "Thái dương hơi hóp làm lộ gò má khi nhìn trực diện").
      + quickFix: Giải pháp tức thì bằng tóc, makeup tạo khối hoặc góc máy (ví dụ: "Để tóc mái bay uốn cong chữ S ngang tầm xương gò má để che khuyết điểm").

QUY ĐỊNH BẮT BUỘC:
- BẮT BUỘC toàn bộ nội dung phải được viết bằng TIẾNG VIỆT CÓ ĐẦY ĐỦ DẤU THANH (sắc, huyền, hỏi, ngã, nặng) và nguyên âm có dấu (ă, â, ê, ô, ơ, ư, đ).
- TUYỆT ĐỐI KHÔNG sử dụng văn mẫu chung chung. Mỗi bức ảnh phải có nhận định khác biệt, phù hợp với gương mặt đó.
- TUYỆT ĐỐI KHÔNG sử dụng bất kỳ biểu tượng cảm xúc (emoji hoặc icon) nào trong toàn bộ văn bản phản hồi.`;

    const asianAestheticsSchema = {
      type: Type.OBJECT,
      properties: {
        visualWeight: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: 'Nùng nhan (Đậm nét) hoặc Đạm nhan (Thanh nhạt)' },
            blankSpaceAnalysis: { type: Type.STRING, description: 'Phân tích độ lưu bạch (khoảng trống trên mặt) và độ tương phản ngũ quan' }
          },
          required: ['category', 'blankSpaceAnalysis']
        },
        boneVsSoftTissue: {
          type: Type.OBJECT,
          properties: {
            dominantType: { type: Type.STRING, description: 'Thiên về Mỹ nhân Cốt tướng, Bì tướng hay Cân bằng' },
            contourSmoothness: { type: Type.STRING, description: 'Đánh giá độ mượt đường viền từ thái dương qua gò má xuống hàm' },
            fourHighsThreeLows: { type: Type.STRING, description: 'Đánh giá độ nổi khối 3D Tứ Cao - Tam Thấp' }
          },
          required: ['dominantType', 'contourSmoothness', 'fourHighsThreeLows']
        },
        visualAgeMatrix: {
          type: Type.OBJECT,
          properties: {
            neotenyVsMaturity: { type: Type.STRING, description: 'Tỷ lệ phần trăm Nét trẻ thơ (Neoteny) vs Trưởng thành (Maturity)' },
            midfaceAndPhiltrum: { type: Type.STRING, description: 'Nhận xét chiều dài tầng mặt giữa và nhân trung' }
          },
          required: ['neotenyVsMaturity', 'midfaceAndPhiltrum']
        },
        asianArchetype: {
          type: Type.OBJECT,
          properties: {
            vibeTitle: { type: Type.STRING, description: 'Ví dụ: Bạch Nguyệt Quang, Thuần Dục, Thiên Kim Tài Phiệt, Minh Tinh Hồng Kông...' },
            animalType: { type: Type.STRING, description: 'Hệ Mèo, Cáo, Cún, Hươu, Thỏ, Cá, hoặc Rắn' },
            detailedExplanation: { type: Type.STRING, description: 'Giải thích vì sao ngũ quan tạo nên khí chất này' }
          },
          required: ['vibeTitle', 'animalType', 'detailedExplanation']
        },
        tailoredAsianStyling: {
          type: Type.OBJECT,
          properties: {
            makeupStyle: { type: Type.STRING, description: 'Gợi ý layout makeup (Douyin, Clean Girl, Hàn Quốc trong veo, Hồng Kông cổ điển...) phù hợp với Visual Weight' },
            cranialHairTip: { type: Type.STRING, description: 'Gợi ý kiểu tóc giúp tạo hiệu ứng Đầu bao mặt (High Cranial Top) và che khuyết điểm viền hàm' }
          },
          required: ['makeupStyle', 'cranialHairTip']
        }
      },
      required: ['visualWeight', 'boneVsSoftTissue', 'visualAgeMatrix', 'asianArchetype', 'tailoredAsianStyling']
    };

    const generateConfig = {
      temperature: 0.1,
      maxOutputTokens: 3800,
      systemInstruction: `Bạn là Hệ thống Phân tích Nhân trắc học & Thẩm mỹ AI cao cấp.
Người dùng cung cấp ảnh chụp kèm thông số đo đạc 3D từ MediaPipe (đây là số liệu chuẩn, KHÔNG tự ý thay đổi điểm số toán học này).

Nếu ảnh chụp hơi nghiêng (dựa vào thông số yaw/pitch/roll), hãy tự động nội suy cấu trúc xương 3D để đánh giá khách quan nhất, không trừ điểm đối xứng do góc máy.

Hãy phân tích khuôn mặt cực kỳ chi tiết qua các lăng kính chuyên môn:
1. Giải phẫu & Tỷ lệ học (Anthropometrics): Phân tích Midface ratio (tỷ lệ tầng mặt giữa), Canthal Tilt (độ nghiêng trục mắt Dương/Âm/Ngang), FWHR, độ mở góc hàm và tỷ lệ 1/3, 1/5.
2. Thẩm mỹ Á Đông & Trọng lượng thị giác (Visual Weight): Xác định Nùng nhan (Đậm nét) hay Đạm nhan (Thanh nhạt), độ lưu bạch, Cốt tướng vs Bì tướng, độ tuổi thị giác Neoteny vs Maturity, và Khí chất Á Đông (Bạch Nguyệt Quang, Thuần Dục, Thiên Kim...).
3. Chuyên gia Định hình Phong cách (Styling & Personal Color): Gợi ý kiểu tóc (kỹ thuật Đầu bao mặt High Cranial Top, độ phồng, phần mái), dáng gọng kính, layout trang điểm Douyin / Clean Girl và bảng màu HEX tôn da.
4. Phân tích Góc mặt đẹp & Nhược điểm (Best Angles & Flaws): Dựa trên thông số bất đối xứng Trái/Phải và danh sách detectedFlaws từ MediaPipe kết hợp quan sát ảnh, hãy chỉ ra thẳng thắn nhưng lịch sự 2-3 điểm chưa hoàn hảo (về khung xương, tỷ lệ mắt/mũi/nhân trung/cằm hoặc mô mềm) và cách dùng tóc/makeup/góc chụp để che đi. Tuyệt đối không khen chung chung.

Tuyệt đối không nhận xét chung chung một câu. Mỗi mục phải chỉ rõ đặc điểm quan sát được trên mắt, mũi, môi, xương hàm của người trong ảnh. BẮT BUỘC toàn bộ nội dung phải được viết bằng tiếng Việt chuẩn ngữ pháp, đầy đủ dấu thanh và nguyên âm có dấu, tuyệt đối không dùng biểu tượng cảm xúc (emoji hoặc icon).`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vibe_type: {
            type: Type.STRING,
            description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Phân loại khuôn mặt theo hệ động vật kèm đặc trưng khí chất'
          },
          eye_shape: {
            type: Type.STRING,
            description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Dáng mắt chủ đạo của diện mạo'
          },
          skin_tone: {
            type: Type.STRING,
            description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Đánh giá sắc tố diện mạo cá nhân Personal Color'
          },
          recommended_hairstyles: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING
            },
            description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Danh sách 3 kiểu tóc phù hợp nhất kèm lý do'
          },
          recommended_glasses: {
            type: Type.STRING,
            description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Hình dáng gọng kính mắt và phụ kiện phù hợp nhất'
          },
          faceShape: {
            type: Type.STRING,
            description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Hình dáng khuôn mặt chính xác (Trái xoan, Tròn, Vuông chữ điền...)'
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
                description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Nhận xét ưu điểm và thần thái của đôi mắt'
              },
              nose: {
                type: Type.STRING,
                description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Nhận xét ưu điểm về sống mũi'
              },
              lips: {
                type: Type.STRING,
                description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Nhận xét ưu điểm về khuôn miệng và nụ cười'
              },
              jawline: {
                type: Type.STRING,
                description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Nhận xét ưu điểm về xương hàm và cằm'
              },
              verticalProportions: {
                type: Type.STRING,
                description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Nhận xét chi tiết về tỷ lệ ba tầng mặt'
              },
              horizontalProportions: {
                type: Type.STRING,
                description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Nhận xét về tỷ lệ năm phần chiều ngang'
              },
              symmetry: {
                type: Type.STRING,
                description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Đánh giá mức độ đối xứng hai nửa mặt'
              }
            },
            required: ['eyes', 'nose', 'lips', 'jawline', 'verticalProportions', 'horizontalProportions', 'symmetry']
          },
          expertPanel: {
            type: Type.OBJECT,
            description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Hội đồng 3 chuyên gia thẩm định đa chiều và tranh luận',
            properties: {
              anthropologist: {
                type: Type.OBJECT,
                description: 'Góc nhìn của Chuyên gia Nhân trắc học & Tỷ lệ vàng',
                properties: {
                  expertTitle: { type: Type.STRING, description: 'Chuyên gia Nhân trắc học & Tỷ lệ vàng' },
                  focusBadge: { type: Type.STRING, description: 'Nhân trắc học & Khung xương' },
                  analysis: { type: Type.STRING, description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Nhận định chuyên sâu về cấu trúc khung xương, tỷ lệ 3 tầng trán - mũi - cằm, ngũ nhãn ngang và độ đối xứng trục hình học' },
                  keyPoint: { type: Type.STRING, description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Đúc kết cốt lõi của chuyên gia nhân trắc học' }
                },
                required: ['expertTitle', 'focusBadge', 'analysis', 'keyPoint']
              },
              aesthetician: {
                type: Type.OBJECT,
                description: 'Góc nhìn của Giám đốc Nghệ thuật & Sắc tố Diện mạo',
                properties: {
                  expertTitle: { type: Type.STRING, description: 'Giám đốc Nghệ thuật & Sắc tố Diện mạo' },
                  focusBadge: { type: Type.STRING, description: 'Sắc thái & Khí chất' },
                  analysis: { type: Type.STRING, description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Nhận định về khí chất ngũ quan, hệ vibe động vật, thần thái ánh mắt và sắc thái màu da cá nhân' },
                  keyPoint: { type: Type.STRING, description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Đúc kết cốt lõi của giám đốc nghệ thuật' }
                },
                required: ['expertTitle', 'focusBadge', 'analysis', 'keyPoint']
              },
              stylist: {
                type: Type.OBJECT,
                description: 'Góc nhìn của Chuyên gia Tạo hình & Định hình Phong cách',
                properties: {
                  expertTitle: { type: Type.STRING, description: 'Chuyên gia Tạo hình & Định hình Phong cách' },
                  focusBadge: { type: Type.STRING, description: 'Tạo hình & Ứng dụng' },
                  analysis: { type: Type.STRING, description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Phân tích chiến lược điều tiết góc cạnh diện mạo bằng kiểu tóc, phom gọng kính và phong cách toàn diện' },
                  keyPoint: { type: Type.STRING, description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Đúc kết cốt lõi của chuyên gia tạo hình' }
                },
                required: ['expertTitle', 'focusBadge', 'analysis', 'keyPoint']
              },
              debateDiscussion: {
                type: Type.STRING,
                description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Đoạn đối thoại và tranh luận ngắn gọn giữa 3 chuyên gia nhằm phản biện và bổ trợ góc nhìn cho nhau trước khi đưa ra kết luận'
              },
              consensusVerdict: {
                type: Type.STRING,
                description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Kết luận thống nhất chung sau phiên hội ý và tranh luận của hội đồng 3 chuyên gia'
              }
            },
            required: ['anthropologist', 'aesthetician', 'stylist', 'debateDiscussion', 'consensusVerdict']
          },
          advancedAesthetics: {
            type: Type.OBJECT,
            description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Đánh giá nhân trắc học chuyên sâu qua 3 lăng kính chuyên môn',
            properties: {
              anthropometrics: {
                type: Type.OBJECT,
                description: 'Lăng kính 1: Giải phẫu & Tỷ lệ học',
                properties: {
                  midfaceRatioAnalysis: { type: Type.STRING, description: 'Phân tích Midface ratio tỷ lệ tầng mặt giữa' },
                  canthalTiltAnalysis: { type: Type.STRING, description: 'Phân tích Canthal Tilt độ nghiêng trục mắt Dương/Âm/Ngang' },
                  fwhrAnalysis: { type: Type.STRING, description: 'Phân tích FWHR tỷ lệ chiều ngang gò má so với chiều cao ngũ quan' },
                  jawAngleAnalysis: { type: Type.STRING, description: 'Phân tích độ mở góc hàm và cấu trúc khung xương' }
                },
                required: ['midfaceRatioAnalysis', 'canthalTiltAnalysis', 'fwhrAnalysis', 'jawAngleAnalysis']
              },
              visualWeight: {
                type: Type.OBJECT,
                description: 'Lăng kính 2: Thẩm mỹ Á Đông & Trọng lượng thị giác',
                properties: {
                  category: { type: Type.STRING, description: 'High Visual Weight (Mặt đậm nét) hoặc Low Visual Weight (Mặt thanh nhạt) hoặc Cân bằng' },
                  description: { type: Type.STRING, description: 'Phân tích kích thước ngũ quan, độ tương phản và khoảng trống' },
                  makeupStylingTip: { type: Type.STRING, description: 'Lời khuyên layout trang điểm và phong cách phù hợp' }
                },
                required: ['category', 'description', 'makeupStylingTip']
              },
              fourHighsThreeLows: {
                type: Type.OBJECT,
                description: 'Tỷ lệ Tứ Cao – Tam Thấp 3D',
                properties: {
                  scoreText: { type: Type.STRING, description: 'Đánh giá mức độ chuẩn mực của cấu trúc Tứ Cao Tam Thấp' },
                  description: { type: Type.STRING, description: 'Phân tích độ nổi khối 3D của trán, chóp mũi, đỉnh môi, đỉnh cằm và các điểm trũng' }
                },
                required: ['scoreText', 'description']
              },
              visualAge: {
                type: Type.OBJECT,
                description: 'Độ tuổi thị giác',
                properties: {
                  tendency: { type: Type.STRING, description: 'Nét Trẻ Thơ Thanh Thuần (Neoteny) hoặc Nét Trưởng Thành Quý Phái (Maturity) hoặc Hài Hòa Cân Bằng' },
                  description: { type: Type.STRING, description: 'Phân tích tỷ lệ mắt, trán, sống mũi và xương hàm tạo nên độ tuổi thị giác' }
                },
                required: ['tendency', 'description']
              }
            },
            required: ['anthropometrics', 'visualWeight', 'fourHighsThreeLows', 'visualAge']
          },
          asianAesthetics: asianAestheticsSchema,
          bestPhotoAngles: {
            type: Type.OBJECT,
            description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Hướng dẫn góc chụp đẹp và ăn ảnh nhất (Bí kíp góc máy)',
            properties: {
              bestSide: { 
                type: Type.STRING, 
                description: 'Nhãn góc thần thánh ngắn gọn, làm nổi bật góc mặt đẹp nhất (ví dụ: Nghiêng 45° Bên Trái, Nghiêng 30° Bên Phải, hoặc Trực diện chếch nhẹ).' 
              },
              cameraHeight: {
                type: Type.STRING,
                description: 'Dòng hướng dẫn ngắn gọn về Độ cao camera (ví dụ: Cao hơn tầm mắt 15-20 độ, hướng nhẹ từ trên xuống).'
              },
              faceRotation: {
                type: Type.STRING,
                description: 'Dòng hướng dẫn ngắn gọn về Góc xoay mặt (ví dụ: Xoay mặt chếch 45 độ sang phải để khoe trọn góc mặt trái thon gọn).'
              },
              expressionTip: {
                type: Type.STRING,
                description: 'Dòng hướng dẫn ngắn gọn về Biểu cảm & ánh sáng (ví dụ: Cười mỉm tự nhiên thả lỏng cơ hàm, mắt nhìn thư thái).'
              },
              cameraAngleGuide: { 
                type: Type.STRING, 
                description: 'Hướng dẫn tổng thể cách đặt camera để che khuyết điểm và tôn đường nét nhất.' 
              },
              poseAndExpressionTip: { 
                type: Type.STRING, 
                description: 'Mẹo biểu cảm khi chụp ảnh (cười mỉm, ánh mắt, cách đón ánh sáng).' 
              }
            },
            required: ['bestSide', 'cameraHeight', 'faceRotation', 'expressionTip']
          },
          flawsAndFixes: {
            type: Type.ARRAY,
            description: 'Bản đồ tinh chỉnh diện mạo (Optimization Map): Danh sách 2 đến 3 điểm cần tinh chỉnh theo cặp đối xứng (Quan sát và Giải pháp tức thì).',
            items: {
              type: Type.OBJECT,
              properties: {
                flawName: { type: Type.STRING, description: 'Tên điểm cần tinh chỉnh ngắn gọn (VD: Thái dương hơi hóp, Tầng mặt giữa dài, Cánh mũi hơi bè...)' },
                observation: { type: Type.STRING, description: 'Mô tả ngắn gọn quan sát thực tế (VD: Thái dương hơi hóp làm lộ gò má).' },
                quickFix: { type: Type.STRING, description: 'Giải pháp tức thì bằng kiểu tóc, makeup tạo khối hoặc góc máy (VD: Để tóc mái bay uốn cong chữ S ngang tầm xương gò má).' }
              },
              required: ['flawName', 'observation', 'quickFix']
            }
          },
          summary: {
            type: Type.STRING,
            description: 'Bắt buộc tiếng Việt có dấu đầy đủ: Lời đúc kết tổng quan diện mạo'
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
          'expertPanel',
          'advancedAesthetics',
          'asianAesthetics',
          'bestPhotoAngles',
          'flawsAndFixes',
          'summary'
        ]
      }
    };

    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash'
    ];

    let response = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
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
        if (response && response.text) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Mô hình ${modelName} phản hồi lỗi: ${err.message}. Đang chuyển tiếp sang mô hình tiếp theo...`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Không thể kết nối đến các mô hình phân tích.');
    }

    let parsedData = JSON.parse(response.text);
    parsedData = sanitizeAnalysisObject(parsedData);

    // Cưỡng chế điểm số luôn theo thuật toán đo đạc toán học chính xác từ MediaPipe
    if (metrics && typeof metrics.calculatedScore10 === 'number') {
      parsedData.harmonyScore = metrics.calculatedScore10;
    }

    // Đồng bộ các trường Thẩm mỹ Á Đông lên cấp cao nhất
    if (parsedData.asianAesthetics) {
      parsedData.visualWeight = parsedData.asianAesthetics.visualWeight;
      parsedData.boneVsSoftTissue = parsedData.asianAesthetics.boneVsSoftTissue;
      parsedData.visualAgeMatrix = parsedData.asianAesthetics.visualAgeMatrix;
      parsedData.asianArchetype = parsedData.asianAesthetics.asianArchetype;
      parsedData.tailoredAsianStyling = parsedData.asianAesthetics.tailoredAsianStyling;
    }

    return res.json({
      success: true,
      vibe_type: parsedData.vibe_type,
      eye_shape: parsedData.eye_shape,
      skin_tone: parsedData.skin_tone,
      recommended_hairstyles: parsedData.recommended_hairstyles,
      recommended_glasses: parsedData.recommended_glasses,
      expertPanel: parsedData.expertPanel,
      advancedAesthetics: parsedData.advancedAesthetics,
      asianAesthetics: parsedData.asianAesthetics,
      visualWeight: parsedData.visualWeight,
      boneVsSoftTissue: parsedData.boneVsSoftTissue,
      visualAgeMatrix: parsedData.visualAgeMatrix,
      asianArchetype: parsedData.asianArchetype,
      tailoredAsianStyling: parsedData.tailoredAsianStyling,
      bestPhotoAngles: parsedData.bestPhotoAngles,
      flawsAndFixes: parsedData.flawsAndFixes,
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
      expertPanel: fallbackData.expertPanel,
      advancedAesthetics: fallbackData.advancedAesthetics,
      asianAesthetics: fallbackData.asianAesthetics,
      visualWeight: fallbackData.visualWeight,
      boneVsSoftTissue: fallbackData.boneVsSoftTissue,
      visualAgeMatrix: fallbackData.visualAgeMatrix,
      asianArchetype: fallbackData.asianArchetype,
      tailoredAsianStyling: fallbackData.tailoredAsianStyling,
      bestPhotoAngles: fallbackData.bestPhotoAngles,
      flawsAndFixes: fallbackData.flawsAndFixes,
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
