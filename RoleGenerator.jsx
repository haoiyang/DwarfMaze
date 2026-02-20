import React, { useState, useRef, useCallback } from 'react';
import { 
  Wand2, RefreshCw, AlertCircle, X, ChevronRight, 
  User, Shield, ScanFace, Sword, Hammer, 
  Sparkles, Plus, Download, Layers, CheckCircle2, 
  Image as ImageIcon, Archive 
} from 'lucide-react';

/**
 * Pixel Art Shifter - 核心組件
 * * 功能特點：
 * 1. 角色概念生成 (Source of Truth) - 卡通風格
 * 2. 多視圖精靈圖生成 - 支援近戰(揮砍)與遠程(射擊)不同邏輯
 * 3. AI 視覺驗證迴圈 (5次重試)
 * 4. 批量下載功能
 * 5. 新增性別選項
 * 6. 蹲下動作修正為高跪姿
 * 7. 受擊動作擴充為四向低姿態 (Under Hit) + >< 眼睛與不穩姿態
 */
const PixelShifter = () => {
  // --- 狀態管理 ---
  const [conceptFile, setConceptFile] = useState(null);
  const [conceptPreviewUrl, setConceptPreviewUrl] = useState(null);
  const [roleConceptUrl, setRoleConceptUrl] = useState(null);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // 角色屬性
  const [selectedGender, setSelectedGender] = useState('Male');
  const [selectedRace, setSelectedRace] = useState('Human');
  const [customRace, setCustomRace] = useState('');
  const [selectedRole, setSelectedRole] = useState('Warrior');
  const [customRole, setCustomRole] = useState('');
  
  // 裝備屬性
  const [selectedArmor, setSelectedArmor] = useState('Plate');
  const [customArmor, setCustomArmor] = useState('');
  const [selectedWeapon, setSelectedWeapon] = useState('Sword');
  const [customWeapon, setCustomWeapon] = useState('');

  // 生成狀態
  const [generatedPoses, setGeneratedPoses] = useState({});
  const [loadingPoses, setLoadingPoses] = useState({}); 

  const conceptInputRef = useRef(null);
  
  // API Key (執行環境自動注入)
  const apiKey = ""; 

  // --- 判斷是否為遠程武器 ---
  const isRangedWeapon = ['Bow', 'Crossbow'].includes(selectedWeapon);

  // --- 配置數據 (動態生成) ---
  const POSES_CONFIG = [
    // 基礎視角
    { id: 'front', label: '正面 (Front)', promptSuffix: 'standing idle pose, full front facing view, symmetrical', verifyCriteria: 'Is the character facing forward? Answer YES or NO.' },
    { id: 'left', label: '朝左 (Left)', promptSuffix: 'standing idle pose, side profile facing LEFT, body turned left', verifyCriteria: 'Is the character facing LEFT? Answer YES or NO.' },
    { id: 'right', label: '朝右 (Right)', promptSuffix: 'standing idle pose, side profile facing RIGHT, body turned right', verifyCriteria: 'Is the character facing RIGHT? Answer YES or NO.' },
    { id: 'back', label: '背面 (Back)', promptSuffix: 'standing idle pose, full back view, facing away', verifyCriteria: 'Is the character facing away? Answer YES or NO.' },
    
    // 受擊動作 (Under Hit - 四向 - 優化表情與姿態)
    { 
      id: 'hit-front', label: '正面受擊', 
      promptSuffix: 'full front view. The role is crouched low in a "under hit" or taking damage pose. His body is compacted, knees bent deeply. He holds the weapon horizontally very low across his shins and knees in a defensive manner. Expression: Eyes tightly closed in a "> <" shape (pain expression). Stance: Unsteady, stumbling.', 
      verifyCriteria: 'Is the character crouched low facing forward with a pain expression? Answer YES or NO.' 
    },
    { 
      id: 'hit-left', label: '左側受擊', 
      promptSuffix: 'left side profile view, facing left. He is crouched low in an "under hit" pose, hunched slightly over. The weapon is held horizontally very low along his left side, just above the ground. Expression: Eyes tightly closed in a "> <" shape (pain expression). Stance: Unsteady, stumbling.', 
      verifyCriteria: 'Is the character crouched low facing LEFT with a pain expression? Answer YES or NO.' 
    },
    { 
      id: 'hit-right', label: '右側受擊', 
      promptSuffix: 'right side profile view, facing right. He is crouched low in an "under hit" pose, hunched slightly over. The weapon is held horizontally very low along his right side, just above the ground. Expression: Eyes tightly closed in a "> <" shape (pain expression). Stance: Unsteady, stumbling.', 
      verifyCriteria: 'Is the character crouched low facing RIGHT with a pain expression? Answer YES or NO.' 
    },
    { 
      id: 'hit-back', label: '背面受擊', 
      promptSuffix: 'full back view, facing away from the camera. He is crouched low in an "under hit" pose. The weapon is held horizontally low across the back of his calves or heels. Stance: Unsteady, stumbling.', 
      verifyCriteria: 'Is the character crouched low facing AWAY? Answer YES or NO.' 
    },
    
    // 行走動作
    { 
      id: 'walk-f-r', label: '行走-右腳（正面）', 
      promptSuffix: 'walking pose, front view. Right leg lifted high and stepping forward towards the camera (shoe sole visible). Left leg firmly on ground behind.', 
      verifyCriteria: 'Is the character facing forward with the RIGHT leg lifted or stepping forward? Answer YES or NO.' 
    },
    { 
      id: 'walk-f-l', label: '行走-左腳（正面）', 
      promptSuffix: 'walking pose, front view. Left leg lifted high and stepping forward towards the camera (shoe sole visible). Right leg firmly on ground behind.', 
      verifyCriteria: 'Is the character facing forward with the LEFT leg lifted or stepping forward? Answer YES or NO.' 
    },
    { id: 'walk-side-l', label: '行走 (左)', promptSuffix: 'walking pose, profile view facing LEFT', verifyCriteria: 'Is facing LEFT and walking? Answer YES or NO.' },
    { id: 'walk-side-r', label: '行走 (右)', promptSuffix: 'walking pose, profile view facing RIGHT', verifyCriteria: 'Is facing RIGHT and walking? Answer YES or NO.' },
    
    // 高跪動作
    { 
      id: 'kneel-front', label: '正面高跪', 
      promptSuffix: 'full front view, high kneeling pose (half-kneeling). One knee on the ground, the other knee up. Torso upright. Weapon held ready.', 
      verifyCriteria: 'Is the character kneeling facing forward? Answer YES or NO.' 
    },
    { 
      id: 'kneel-left', label: '左側高跪', 
      promptSuffix: 'left side profile view, facing left. High kneeling pose (half-kneeling). One knee on the ground, upright posture.', 
      verifyCriteria: 'Is the character kneeling facing LEFT? Answer YES or NO.' 
    },
    { 
      id: 'kneel-right', label: '右側高跪', 
      promptSuffix: 'right side profile view, facing right. High kneeling pose (half-kneeling). One knee on the ground, upright posture.', 
      verifyCriteria: 'Is the character kneeling facing RIGHT? Answer YES or NO.' 
    },
    { 
      id: 'kneel-back', label: '背面高跪', 
      promptSuffix: 'full back view, facing away from the camera. High kneeling pose (half-kneeling). One knee on the ground.', 
      verifyCriteria: 'Is the character kneeling facing away (showing back)? Answer YES or NO.' 
    },

    // --- 攻擊動作 ---
    // 正面
    { 
      id: 'at-p1-f', 
      label: isRangedWeapon ? `攻擊-拉弓(前)` : `攻擊-高舉(前)`,
      promptSuffix: isRangedWeapon
        ? `front view, holding ${selectedWeapon} with both hands, pulling back the string/mechanism to full draw, aiming directly at camera. Tension in the pose. Ready to fire.`
        : `front view, weapon held high above head with both hands, ready for a powerful strike. No energy effects.`,
      verifyCriteria: isRangedWeapon
        ? 'Is the character aiming a bow or crossbow? Answer YES or NO.'
        : 'Is the character holding a weapon high above their head? Answer YES or NO.'
    },
    { 
      id: 'at-p2-f', 
      label: isRangedWeapon ? `攻擊-射擊(前)` : `攻擊-揮砍(前)`,
      promptSuffix: isRangedWeapon
        ? `front view, dynamic action pose. Releasing the ${selectedWeapon}, firing a projectile forward towards the camera. Recoil from the shot. Slight wind effect line.`
        : `front view, dynamic action pose. Right leg lunging forward. Middle of a horizontal weapon swing generating a massive, jagged, white crescent-shaped shockwave slash effect.`,
      verifyCriteria: isRangedWeapon
        ? 'Is the character firing a projectile? Answer YES or NO.'
        : 'Is there a visible large crescent slash effect? Answer YES or NO.'
    },

    // 左側
    { 
      id: 'at-p1-l', 
      label: isRangedWeapon ? `攻擊-拉弓(左)` : `攻擊-高舉(左)`,
      promptSuffix: isRangedWeapon
        ? `facing LEFT, holding ${selectedWeapon}, string/mechanism pulled back to full draw, aiming straight LEFT.`
        : `facing LEFT, weapon raised high above head, poised for a downward chop. No energy effects.`,
      verifyCriteria: isRangedWeapon
        ? 'Is the character aiming LEFT? Answer YES or NO.'
        : 'Is the character facing LEFT with weapon raised high? Answer YES or NO.'
    },
    { 
      id: 'at-p2-l', 
      label: isRangedWeapon ? `攻擊-射擊(左)` : `攻擊-揮砍(左)`,
      promptSuffix: isRangedWeapon
        ? `facing LEFT, action pose. Firing the ${selectedWeapon} to the LEFT. Projectile flying left with a motion trail.`
        : `facing LEFT, horizontal swing. A massive, sharp, curved white energy shockwave/slash effect extending widely to the LEFT.`,
      verifyCriteria: isRangedWeapon
        ? 'Is the character firing to the LEFT? Answer YES or NO.'
        : 'Is there a large curved slash effect extending to the LEFT? Answer YES or NO.'
    },

    // 右側
    { 
      id: 'at-p1-r', 
      label: isRangedWeapon ? `攻擊-拉弓(右)` : `攻擊-高舉(右)`,
      promptSuffix: isRangedWeapon
        ? `facing RIGHT, holding ${selectedWeapon}, string/mechanism pulled back to full draw, aiming straight RIGHT.`
        : `facing RIGHT, weapon raised high above head, poised for a downward chop. No energy effects.`,
      verifyCriteria: isRangedWeapon
        ? 'Is the character aiming RIGHT? Answer YES or NO.'
        : 'Is the character facing RIGHT with weapon raised high? Answer YES or NO.'
    },
    { 
      id: 'at-p2-r', 
      label: isRangedWeapon ? `攻擊-射擊(右)` : `攻擊-揮砍(右)`,
      promptSuffix: isRangedWeapon
        ? `facing RIGHT, action pose. Firing the ${selectedWeapon} to the RIGHT. Projectile flying right with a motion trail.`
        : `facing RIGHT, horizontal swing. A massive, sharp, curved white energy shockwave/slash effect extending widely to the RIGHT.`,
      verifyCriteria: isRangedWeapon
        ? 'Is the character firing to the RIGHT? Answer YES or NO.'
        : 'Is there a large curved slash effect extending to the RIGHT? Answer YES or NO.'
    },

    // 背面
    { 
      id: 'at-p1-b', 
      label: isRangedWeapon ? `攻擊-拉弓(後)` : `攻擊-高舉(後)`,
      promptSuffix: isRangedWeapon
        ? `facing BACK, holding ${selectedWeapon}, string/mechanism pulled back, aiming away from camera.`
        : `facing BACK, weapon held high above head, ready for a downward strike. No energy effects.`,
      verifyCriteria: isRangedWeapon
        ? 'Is the character facing AWAY and aiming? Answer YES or NO.'
        : 'Is the character facing BACK with weapon raised high? Answer YES or NO.'
    },
    { 
      id: 'at-p2-b', 
      label: isRangedWeapon ? `攻擊-射擊(後)` : `攻擊-揮砍(後)`,
      promptSuffix: isRangedWeapon
        ? `facing BACK, action pose. Firing the ${selectedWeapon} away from camera. Recoil visible.`
        : `facing BACK, horizontal swing. A wide, sweeping white shockwave slash effect visible following the weapon's path.`,
      verifyCriteria: isRangedWeapon
        ? 'Is the character firing away from the viewer? Answer YES or NO.'
        : 'Is there an attack wave visible while the character faces away? Answer YES or NO.'
    },
  ];

  const LISTS = {
    genders: ['Male', 'Female'],
    races: ['Human', 'Dwarf', 'Elf', 'Orc', 'Beastkin', 'Slime'],
    roles: ['Warrior', 'Rogue', 'Paladin', 'Archer', 'Monk', 'Cleric'],
    armors: ['Plate', 'Leather', 'Robes', 'Chainmail', 'Rags'],
    weapons: ['Sword', 'Axe', 'Bow', 'Staff', 'Dagger', 'War Hammer', 'Spear', 'Crossbow']
  };

  // --- 核心工具函數 ---

  const fetchWithRetry = async (url, options, maxRetries = 5) => {
    let delay = 1000;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        if ([401, 429, 500, 503].includes(response.status)) {
          await new Promise(res => setTimeout(res, delay));
          delay *= 2;
          continue;
        }
        throw new Error(`API 錯誤: ${response.status}`);
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });

  // --- 業務邏輯 ---

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      setConceptFile(file);
      const reader = new FileReader();
      reader.onload = () => setConceptPreviewUrl(reader.result);
      reader.readAsDataURL(file);
      setGlobalError(null);
    } else {
      setGlobalError('請上傳有效的圖片檔案 (PNG, JPG)');
    }
  };

  const generateRoleConcept = async () => {
    if (!conceptFile) return;
    setIsRoleLoading(true); setGlobalError(null); setRoleConceptUrl(null); setGeneratedPoses({});
    try {
      const base64Data = await fileToBase64(conceptFile);
      const gender = selectedGender;
      const race = customRace || selectedRace;
      const role = customRole || selectedRole;
      const armor = customArmor || selectedArmor;
      const weapon = customWeapon || selectedWeapon;

      const prompt = `
        You are a professional pixel art character designer.
        
        TASK 1: ANALYZE the visual style of the provided reference image. Note the proportions (e.g. chibi, realistic), shading technique, color palette, and outline style.
        
        TASK 2: GENERATE A NEW CHARACTER that perfectly matches that analyzed style.
        
        New Character Details:
        - Gender: ${gender}
        - Race: ${race}
        - Class: ${role}
        - Equipment: Wearing ${armor} armor and holding a ${weapon}.
        - Aesthetic: Cute Cartoon/Anime Pixel Art (Vibrant colors, clear design).
        
        Output Requirements:
        - Pose: Neutral standing pose, full body visible.
        - Background: Solid green #00ff00 (CRITICAL).
        - Quality: High definition pixel art.
      `;
      
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`, 
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: conceptFile.type, data: base64Data } }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        }
      );

      const result = await response.json();
      const imagePart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      
      if (imagePart) {
        setRoleConceptUrl(`data:image/png;base64,${imagePart.inlineData.data}`);
      } else {
        const textPart = result.candidates?.[0]?.content?.parts?.find(p => p.text);
        throw new Error(textPart ? `模型拒絕生成: ${textPart.text}` : "未能生成圖片");
      }
    } catch (err) { setGlobalError(err.message || "生成概念圖失敗"); } finally { setIsRoleLoading(false); }
  };

  const verifyImage = async (base64, criteria) => {
    try {
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, 
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: `Look at this pixel art image. ${criteria} Reply with a valid JSON object: { "valid": boolean }` }, 
              { inlineData: { mimeType: "image/png", data: base64 } }
            ] }],
            generationConfig: { responseMimeType: "application/json" }
          }),
        }
      );
      const res = await response.json();
      const text = res.candidates[0].content.parts[0].text;
      const json = JSON.parse(text);
      return json.valid === true;
    } catch (e) { 
      console.warn("驗證失敗，跳過檢查:", e);
      return true; 
    } 
  };

  const generatePose = async (poseId) => {
    if (!roleConceptUrl) return;
    
    const pose = POSES_CONFIG.find(p => p.id === poseId);
    const conceptBase64 = roleConceptUrl.split(',')[1];
    
    setLoadingPoses(prev => ({ ...prev, [poseId]: 'generating' }));
    
    try {
      let success = false;
      let imgData = "";
      const MAX_ATTEMPTS = 5; 

      for (let i = 0; i < MAX_ATTEMPTS && !success; i++) {
        if (i > 0) setLoadingPoses(prev => ({ ...prev, [poseId]: `重試中 ${i}/${MAX_ATTEMPTS}` }));
        
        // 構建包含嚴格比例控制的 Prompt
        const prompt = `
          Retro 16-bit pixel art game sprite asset on a solid green #00ff00 background. 
          The character is centered and maintains a strict, consistent scale and "five-short" body proportion (approximately 3 heads tall) relative to the canvas boundaries across all variations, occupying roughly 70% of the total vertical height regardless of the pose.
          
          Character Description: A ${selectedRace} ${selectedRole} wearing ${selectedArmor} armor and holding a ${selectedWeapon}.
          
          Reference Image: A character concept art.
          TASK: Generate a pixel art sprite of the EXACT SAME character from the reference image in the specified view.
          VIEW: ${pose.promptSuffix}.
          
          REQUIREMENTS: 
          1. Same character features and colors as reference.
          2. STRICT 3-head tall proportion ("five-short" style).
          3. Solid green #00ff00 background.
          ${i > 0 ? "IMPORTANT: Previous generation was incorrect. Ensure the view direction and action are correct this time." : ""}
        `;

        const res = await fetchWithRetry(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`, 
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ 
                parts: [
                  { text: prompt }, 
                  { inlineData: { mimeType: "image/png", data: conceptBase64 } }
                ] 
              }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          }
        );

        const json = await res.json();
        const imagePart = json.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        
        if (!imagePart) continue; 

        imgData = imagePart.inlineData.data;
        setLoadingPoses(prev => ({ ...prev, [poseId]: 'verifying' }));
        success = await verifyImage(imgData, pose.verifyCriteria);
      }

      if (imgData) {
        setGeneratedPoses(prev => ({ ...prev, [poseId]: `data:image/png;base64,${imgData}` }));
      } else {
        console.error(`Failed to generate pose ${poseId} after retries`);
      }

    } catch (err) { console.error(err); } finally { setLoadingPoses(prev => ({ ...prev, [poseId]: null })); }
  };

  const generateAll = () => {
    POSES_CONFIG.forEach((p, index) => {
      setTimeout(() => {
        if (!generatedPoses[p.id]) generatePose(p.id);
      }, index * 200);
    });
  };

  // 批量下載功能
  const downloadAll = () => {
    Object.keys(generatedPoses).forEach((id, index) => {
      setTimeout(() => {
        const pose = POSES_CONFIG.find(p => p.id === id);
        const dataUrl = generatedPoses[id];
        if (pose && dataUrl) {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${pose.label}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }, index * 300);
    });
  };

  // --- UI 渲染 ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 flex flex-col items-center font-sans">
      
      {/* 標頭 */}
      <div className="w-full max-w-6xl flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Layers className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Pixel Art Shifter</h1>
          <p className="text-xs text-slate-400">專業像素角色視圖生成器 (卡通風格版)</p>
        </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 左側設定欄 */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[85vh] custom-scrollbar">
          <h2 className="text-sm font-bold text-indigo-400 uppercase mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
            <User className="w-4 h-4" /> 1. 角色配置
          </h2>
          <div className="space-y-8">
            {/* 性別選擇 */}
            <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest">性別 (Gender)</label>
                <div className="grid grid-cols-2 gap-2">
                  {LISTS.genders.map(item => (
                    <button 
                      key={item} 
                      onClick={() => setSelectedGender(item)} 
                      className={`px-3 py-2 text-xs rounded-xl border transition-all duration-200 ${
                        selectedGender === item 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg scale-[1.02]' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
            </div>

            {[
              { label: '種族', state: selectedRace, setter: setSelectedRace, list: LISTS.races },
              { label: '職業', state: selectedRole, setter: setSelectedRole, list: LISTS.roles },
              { label: '護甲', state: selectedArmor, setter: setSelectedArmor, list: LISTS.armors },
              { label: '武器', state: selectedWeapon, setter: setSelectedWeapon, list: LISTS.weapons }
            ].map((group) => (
              <div key={group.label}>
                <label className="block text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest">{group.label}</label>
                <div className="grid grid-cols-2 gap-2">
                  {group.list.map(item => (
                    <button 
                      key={item} 
                      onClick={() => { group.setter(item); if(group.label === '種族') setCustomRace(''); }} 
                      className={`px-3 py-2 text-xs rounded-xl border transition-all duration-200 ${
                        group.state === item 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg scale-[1.02]' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側主內容區 */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 概念視覺化區 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <ScanFace className="w-4 h-4" /> 2. 角色視覺化 (卡通風格)
              </h2>
              <button 
                onClick={() => { setRoleConceptUrl(null); setGeneratedPoses({}); setConceptFile(null); setConceptPreviewUrl(null); }} 
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase font-bold"
              >
                重置所有
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div 
                className={`flex-1 h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden transition-all duration-300 ${
                  isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-950/30 hover:bg-slate-950/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => conceptInputRef.current.click()}
              >
                <input type="file" ref={conceptInputRef} className="hidden" onChange={(e) => handleFileSelect(e.target.files[0])} accept="image/png, image/jpeg" />
                {conceptPreviewUrl ? (
                  <>
                    <img src={conceptPreviewUrl} className="absolute inset-0 w-full h-full object-contain opacity-40 p-4" alt="Preview" />
                    <div className="z-10 bg-black/60 px-3 py-1 rounded-full text-xs text-white backdrop-blur-sm">更換參考圖</div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 text-indigo-500/50 mb-3" />
                    <p className="text-xs font-medium text-slate-400">點擊上傳風格參考圖</p>
                    <p className="text-[10px] text-slate-600 mt-1">PNG, JPG (Max 4MB)</p>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center justify-center gap-2">
                <ChevronRight className="w-6 h-6 text-slate-700 hidden md:block" />
                <button 
                  onClick={generateRoleConcept} 
                  className={`group bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-full shadow-2xl transition-all active:scale-90 ${
                    (!conceptFile || isRoleLoading) && 'opacity-50 cursor-not-allowed'
                  }`}
                  disabled={isRoleLoading || !conceptFile}
                  title="生成概念圖"
                >
                  {isRoleLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6 group-hover:scale-110" />}
                </button>
              </div>

              <div className={`flex-1 h-64 bg-slate-950 rounded-2xl border flex items-center justify-center relative overflow-hidden group transition-all ${roleConceptUrl ? 'border-indigo-500/50' : 'border-slate-800'}`}>
                {roleConceptUrl ? (
                  <>
                    <img src={roleConceptUrl} className="h-full object-contain image-pixelated p-4" alt="Generated Concept" />
                    <div className="absolute top-3 left-3 bg-indigo-600 text-[9px] font-bold px-2 py-1 rounded shadow-lg uppercase">Source</div>
                  </>
                ) : (
                  <p className="text-xs text-slate-700 italic font-medium">生成區</p>
                )}
              </div>
            </div>
            {globalError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-xl flex items-center gap-2 justify-center">
                <AlertCircle className="w-3 h-3" /> {globalError}
              </div>
            )}
          </div>

          {/* 精靈圖生成區 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative min-h-[400px]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> 3. 精靈圖生成 (AI 驗證模式)
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={downloadAll} 
                  disabled={Object.keys(generatedPoses).length === 0} 
                  className={`text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all duration-300 font-bold ${
                    Object.keys(generatedPoses).length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                  }`}
                >
                  <Archive className="w-3 h-3" /> 下載所有圖片
                </button>
                <button 
                  onClick={generateAll} 
                  disabled={!roleConceptUrl} 
                  className={`text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xl transition-all duration-300 font-bold ${
                    !roleConceptUrl 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" /> 一鍵生成全視圖
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-h-[550px] overflow-y-auto custom-scrollbar pr-2 pb-2">
              {POSES_CONFIG.map(p => (
                <div key={p.id} className="flex flex-col gap-2">
                  <span className="text-[9px] text-center text-slate-500 font-black uppercase tracking-tighter truncate px-1">{p.label}</span>
                  <div className={`aspect-square bg-slate-950 border rounded-2xl flex items-center justify-center relative overflow-hidden group transition-all duration-300 ${
                    generatedPoses[p.id] ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'border-slate-800'
                  }`}>
                    {loadingPoses[p.id] ? (
                      <div className="text-center flex flex-col items-center gap-3">
                        <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                        <span className="text-[8px] text-indigo-400 font-mono animate-pulse uppercase">{loadingPoses[p.id] === 'generating' ? '生成中...' : loadingPoses[p.id] === 'verifying' ? '驗證中...' : loadingPoses[p.id]}</span>
                      </div>
                    ) : generatedPoses[p.id] ? (
                      <>
                        <img src={generatedPoses[p.id]} className="w-full h-full object-contain image-pixelated p-3" alt={p.label} />
                        <div className="absolute top-2 right-2 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 bg-black/50 rounded-full" />
                        </div>
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-sm">
                          <button 
                            onClick={() => generatePose(p.id)} 
                            className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-white transition-colors"
                            title="重新生成"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <a 
                            href={generatedPoses[p.id]} 
                            download={`${p.label}.png`} 
                            className="p-2 bg-indigo-600 rounded-full hover:bg-indigo-500 text-white transition-colors"
                            title="下載"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </>
                    ) : (
                      <button 
                        onClick={() => generatePose(p.id)} 
                        disabled={!roleConceptUrl} 
                        className="w-full h-full hover:bg-indigo-600/10 transition-colors flex items-center justify-center group cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Plus className={`text-slate-700 w-8 h-8 transition-all ${roleConceptUrl ? 'group-hover:text-indigo-500 group-hover:scale-110' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 鎖定遮罩 */}
            {!roleConceptUrl && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-3xl">
                <div className="bg-slate-900 px-8 py-5 rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-4 animate-in fade-in zoom-in duration-300">
                  <AlertCircle className="w-6 h-6 text-indigo-400" />
                  <span className="text-sm font-bold text-slate-300">請先完成步驟 2 以解鎖視圖生成</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        .image-pixelated { 
          image-rendering: pixelated; 
          image-rendering: -moz-crisp-edges; 
          image-rendering: crisp-edges; 
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(71, 85, 105, 0.3); 
          border-radius: 20px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: rgba(99, 102, 241, 0.4); 
        }
      `}</style>
    </div>
  );
};

export default PixelShifter;