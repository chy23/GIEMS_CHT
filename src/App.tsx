import { useState, useEffect, useMemo, useRef } from 'react';
import curriculumData from './curriculum_data.json';
import referenceAnswers from './referenceAnswers.json';
import { getRandomItems } from './utils';
import { exportToDocx } from './exportDocx';

type Status = 'higher' | 'similar' | 'lower' | '';

export interface DimensionItem {
  id: string;
  name: string;
  status: Status;
  ability: string;
}

export interface CurriculumItem {
  theme: string;
  subTheme: string;
  code: string;
  grade: string;
  description: string;
  strategy?: string;
  matchedAbility?: string;
}

const initialItems: DimensionItem[] = [
  { id: 'overall', name: '整體', status: '', ability: '' },
  { id: 'phonetics', name: '形音知識', status: '', ability: '' },
  { id: 'vocabulary', name: '字詞知識', status: '', ability: '' },
  { id: 'grammar', name: '語法知識', status: '', ability: '' },
  { id: 'rhetoric', name: '修辭知識', status: '', ability: '' },
  { id: 'organization', name: '章法知識', status: '', ability: '' },
  { id: 'genre', name: '文體知識', status: '', ability: '' },
  { id: 'word_comp', name: '字詞理解', status: '', ability: '' },
  { id: 'sentence_comp', name: '句子理解', status: '', ability: '' },
  { id: 'paragraph_comp', name: '段落理解', status: '', ability: '' },
  { id: 'passage_comp', name: '篇章理解', status: '', ability: '' },
];

const abilityOptions: Record<string, string[]> = {
  phonetics: ['形近字辨識', '同音字辨識', '形近字音', '多音字音'],
  vocabulary: ['字詞涵義', '四字詞語', '成語運用'],
  grammar: ['標點符號', '詞類分辨', '基本與複句句型', '病句修改'],
  rhetoric: ['譬喻與擬人', '排比與對偶', '誇飾與設問'],
  organization: ['自然段與意義段', '順敘與倒敘', '篇章組織結構'],
  genre: ['記敘與抒情文本', '說明與議論文本', '應用與詩歌文本'],
  word_comp: ['上下文推論詞義', '一詞多義與語氣', '近反義詞替換'],
  sentence_comp: ['長句縮短與重述', '關聯詞邏輯關係', '推論語句隱含意義'],
  paragraph_comp: ['擷取段落重點', '歸納段落大意與主旨', '推論段落因果關係'],
  passage_comp: ['直接理解篇章訊息', '推論理解篇章內容', '詮釋整合篇章主旨'],
};

const dimensionNames = initialItems
  .filter(item => item.id !== 'overall')
  .map(item => item.name);

const STAGE_ORDER: Record<string, number> = {
  'Ⅰ': 1,
  'Ⅱ': 2,
  'Ⅲ': 3,
};

function getStageFromCode(code: string): string {
  const parts = code.split('-');
  return parts[1] || 'Ⅲ';
}

function App() {
  const [district, setDistrict] = useState('林口');
  const [school, setSchool] = useState('麗園');
  const [academicYear, setAcademicYear] = useState('');
  const [subject, setSubject] = useState('國語文');

  const [items, setItems] = useState<DimensionItem[]>(initialItems);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [selectedSubThemes, setSelectedSubThemes] = useState<string[]>([]);

  const [sec3Checked, setSec3Checked] = useState<string[]>([]);
  const [sec4Checked, setSec4Checked] = useState<string[]>([]);
  const [sec5Checked, setSec5Checked] = useState<string[]>([]);

  useEffect(() => {
    setSec3Checked(getRandomItems(referenceAnswers.section3, 3, 5));
    setSec4Checked(getRandomItems(referenceAnswers.section4, 3, 5));
    setSec5Checked(getRandomItems(referenceAnswers.section5, 3, 5));
  }, []);

  const handleCheck = (section: string, item: string) => {
    if (section === 'sec3') {
      setSec3Checked(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    } else if (section === 'sec4') {
      setSec4Checked(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    } else if (section === 'sec5') {
      setSec5Checked(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    }
  };

  const updateItem = (id: string, field: keyof DimensionItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));

    if (field === 'status' && value === 'lower') {
      const changedItem = items.find(i => i.id === id);
      if (changedItem && changedItem.id !== 'overall') {
        setSelectedDimensions(prev => prev.includes(changedItem.name) ? prev : [...prev, changedItem.name]);
        const abilities = changedItem.ability.split('、').filter(Boolean);
        const toAdd = abilities.length > 0 ? abilities : (abilityOptions[id] || []);
        if (toAdd.length > 0) {
          setSelectedSubThemes(prev => Array.from(new Set([...prev, ...toAdd])));
        }
      }
    }
  };

  const sampledCurriculum = useMemo(() => {
    if (selectedSubThemes.length === 0) return [];

    const itemsByStageAndSub: Record<string, Record<string, CurriculumItem[]>> = {
      'Ⅰ': {}, 'Ⅱ': {}, 'Ⅲ': {}
    };

    (curriculumData as CurriculumItem[]).forEach((item) => {
      const stage = getStageFromCode(item.code);
      if (!itemsByStageAndSub[stage]) return;

      const sub = item.matchedAbility || '';
      if (selectedSubThemes.includes(sub)) {
        if (!itemsByStageAndSub[stage][sub]) itemsByStageAndSub[stage][sub] = [];
        itemsByStageAndSub[stage][sub].push(item);
      }
    });

    const result: CurriculumItem[] = [];

    ['Ⅰ', 'Ⅱ', 'Ⅲ'].forEach(stage => {
      const subsForStage = Object.keys(itemsByStageAndSub[stage]);
      if (subsForStage.length === 0) return;

      const targetCount = Math.floor(Math.random() * 3) + 4; // 4, 5, or 6 per stage
      const selectedForStage: CurriculumItem[] = [];

      const pools = subsForStage.map(sub => {
        const arr = [...itemsByStageAndSub[stage][sub]];
        return arr.sort(() => 0.5 - Math.random());
      });

      let added = true;
      while (selectedForStage.length < targetCount && added) {
        added = false;
        for (const pool of pools) {
          if (selectedForStage.length >= targetCount) break;
          if (pool.length > 0) {
            selectedForStage.push(pool.pop()!);
            added = true;
          }
        }
      }

      result.push(...selectedForStage);
    });

    return result.sort((a, b) => {
      const aParts = a.code.split('-');
      const bParts = b.code.split('-');
      const stageA = STAGE_ORDER[aParts[1]] || 9;
      const stageB = STAGE_ORDER[bParts[1]] || 9;
      if (stageA !== stageB) return stageA - stageB;
      if (aParts[0] !== bParts[0]) return aParts[0].localeCompare(bParts[0]);
      return parseInt(aParts[2] || '0') - parseInt(bParts[2] || '0');
    });
  }, [selectedSubThemes]);

  const getResultSuffix = (status: Status) => {
    if (status === 'higher') return '表現良好';
    if (status === 'similar') return '保持穩定';
    if (status === 'lower') return '需稍加強';
    return '...';
  };

  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const handleExport = () => {
    const sec2TableRows: { item: string; strategy: string; grade: string }[] = [];
    if (tbodyRef.current) {
      const rows = tbodyRef.current.querySelectorAll('tr');
      rows.forEach(row => {
        const textareas = row.querySelectorAll('textarea');
        const inputs = row.querySelectorAll('input');
        if (textareas.length > 0 && inputs.length > 0) {
          const itemCell = row.cells[0]?.textContent || '';
          const strategy = textareas[0].value;
          const grade = inputs[0].value;
          sec2TableRows.push({ item: itemCell, strategy, grade });
        }
      });
    }

    exportToDocx(
      { district, school, academicYear, subject },
      items,
      sec2TableRows,
      sec3Checked.map((item, idx) => `${idx + 1}、${item}`).join('\n'),
      sec4Checked.map((item, idx) => `${idx + 1}、${item}`).join('\n'),
      sec5Checked.map((item, idx) => `${idx + 1}、${item}`).join('\n')
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 shadow-sm border border-gray-200">

        {/* Title Section */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all duration-100 ease-out text-white font-bold py-2 px-4 rounded shadow text-sm cursor-pointer"
          >
            匯出 DOCX 檔
          </button>
        </div>
        <h1 className="text-base sm:text-lg md:text-xl font-bold text-center mb-10 leading-tight tracking-tight whitespace-nowrap flex items-center justify-center flex-wrap gap-y-2">
          新北市
          <input
            type="text"
            className="bg-gray-100 rounded-md mx-1 py-1 w-12 md:w-16 text-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="區"
          />
          區
          <input
            type="text"
            className="bg-gray-100 rounded-md mx-1 py-1 w-16 md:w-24 text-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="校名"
          />
          國民小學
          <input
            type="text"
            className="bg-gray-100 rounded-md mx-1 py-1 w-12 md:w-16 text-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="學年度"
          />
          學年度【
          <input
            type="text"
            className="bg-gray-100 rounded-md mx-1 py-1 w-16 md:w-20 text-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="科目"
          />
          科能力檢測】結果分析及因應措施
        </h1>

        {/* Section 1 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">一、【檢測結果分析】</h2>
          <p className="mb-4 text-gray-700">
            可依【<span className="font-semibold">{subject || '國語文'}</span>科檢測評量向度與題目分類細目表】進行分析，例如：
          </p>

          <div className="space-y-4 ml-4">
            {items.map((item, index) => {
              let groupHeader = null;
              if (index === 0) groupHeader = <h3 className="font-bold text-lg text-blue-800 mb-2 mt-4">整體</h3>;
              if (index === 1) groupHeader = <h3 className="font-bold text-lg text-blue-800 mb-2 mt-8">語文知識向度分析</h3>;
              if (index === 7) groupHeader = <h3 className="font-bold text-lg text-blue-800 mb-2 mt-8">閱讀理解向度分析</h3>;

              const opts = abilityOptions[item.id] || [];

              return (
                <div key={item.id}>
                  {groupHeader}
                  <div className="flex items-start bg-blue-50 p-4 rounded-md border-l-4 border-blue-400">
                    <span className="mr-2 font-bold text-blue-700">{index + 1}.</span>
                    <div className="leading-relaxed flex-1">
                      (與全市學生作答答對率相比)本校學生<span className="font-bold border-b border-gray-400 pb-1 px-2">{item.name === '整體' ? '整體' : `${item.name}向度`}</span>通過率
                      <select
                        className="border-b-2 border-gray-400 mx-2 text-center focus:outline-none focus:border-blue-500 bg-transparent text-blue-700 font-semibold cursor-pointer"
                        value={item.status}
                        onChange={(e) => updateItem(item.id, 'status', e.target.value as Status)}
                      >
                        <option value="">(請選擇)</option>
                        <option value="higher">高於</option>
                        <option value="similar">接近</option>
                        <option value="lower">低於</option>
                      </select>
                      市平均
                      {item.id === 'overall' ? '。' : (
                        <>
                          ，表示在
                          <div className="inline-flex gap-3 ml-2 flex-wrap items-center">
                            {opts.map(opt => (
                              <label key={opt} className="flex items-center text-sm cursor-pointer hover:text-blue-700">
                                <input
                                  type="checkbox"
                                  className="mr-1"
                                  checked={item.ability.includes(opt)}
                                  onChange={(e) => {
                                    let newAbility = item.ability.split('、').filter(Boolean);
                                    if (e.target.checked) newAbility.push(opt);
                                    else newAbility = newAbility.filter(a => a !== opt);
                                    updateItem(item.id, 'ability', newAbility.join('、'));
                                  }}
                                />
                                {opt}
                              </label>
                            ))}
                            <span className="ml-1">的能力方面，</span>
                          </div>
                          <span className="font-bold border-b border-gray-400 pb-1 px-2 text-blue-800">
                            {item.status ? getResultSuffix(item.status) : '(將依選擇自動變更)'}
                          </span>。
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">二、【改善教學及定期評量命題策略】</h2>
          <p className="mb-4 text-gray-700 text-sm">
            --各校應參考國語文和數學、英語文檢測試題答案、命題架構與答對率分析等統計數據，分析各項能力指標，擬定具體教學目標，尋找合適教學素材，並設計適當教學策略與方法，<span className="text-red-500 underline underline-offset-2">進一步作為改善學生定期學習評量之命題(例如：於高年級國語文和數學定期評量紙筆測驗增加多元題型之命題型式)</span>。
          </p>

          <div className="mb-4">
            <label className="mr-2 font-bold text-gray-800">請勾選欲改善之向度與次主題：</label>
            <div className="flex flex-col gap-2 mt-2 mb-2">
              {dimensionNames.map(dim => {
                const dimId = Object.keys(abilityOptions).find(k => initialItems.find(i => i.id === k)?.name === dim)!;
                const subs = abilityOptions[dimId] || [];
                return (
                  <div key={dim} className="flex items-center bg-gray-100 p-3 rounded border border-gray-300 min-h-[48px]">
                    <label className="flex items-center cursor-pointer font-bold w-32 shrink-0">
                      <input
                        type="checkbox"
                        className="mr-2 w-4 h-4"
                        checked={selectedDimensions.includes(dim)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDimensions(prev => [...prev, dim]);
                          } else {
                            setSelectedDimensions(prev => prev.filter(d => d !== dim));
                            setSelectedSubThemes(prev => prev.filter(s => !subs.includes(s)));
                          }
                        }}
                      />
                      {dim}
                    </label>
                    <div className="flex flex-wrap gap-4 ml-4 transition-all duration-300 ease-out">
                      {selectedDimensions.includes(dim) && subs.map(sub => (
                        <label key={sub} className="flex items-center cursor-pointer text-sm text-gray-700 hover:text-blue-600 animate-[fadeIn_0.2s_ease-out]">
                          <input
                            type="checkbox"
                            className="mr-1 w-4 h-4"
                            checked={selectedSubThemes.includes(sub)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedSubThemes(prev => [...prev, sub]);
                              else setSelectedSubThemes(prev => prev.filter(s => s !== sub));
                            }}
                          />
                          {sub}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="text-sm text-gray-500 block">第一大題評估為「低於」市平均的向度及其選取的次主題會自動帶入此處，您也可以手動勾選調整。</span>
          </div>

          <table className="w-full border-collapse border border-black text-center mb-6">
            <thead>
              <tr className="border-b border-black font-bold">
                <th className="border-r border-black p-2 w-1/4">亟需改善之項目</th>
                <th className="border-r border-black p-2 w-2/4 text-red-500 underline underline-offset-2">改善教學及定期評量命題策略</th>
                <th className="p-2 w-1/4">實施年級</th>
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {selectedDimensions.length === 0 || sampledCurriculum.length === 0 ? (
                <tr className="border-b border-black">
                  <td colSpan={3} className="p-4 text-gray-500">請先於上方勾選欲改善之向度與次主題以帶入 108 課綱資料。</td>
                </tr>
              ) : (
                sampledCurriculum.map((item: CurriculumItem, index: number) => {
                  return (
                    <tr key={`${item.code}-${index}`} className="border-b border-black">
                      <td className="border-r border-black p-2 text-left align-top text-sm">
                        <span className="font-bold text-blue-700">[{item.code}]</span>{' '}
                        <span className="text-xs text-gray-500">({item.subTheme})</span><br />
                        {item.description}
                      </td>
                      <td className="border-r border-black p-0">
                        <textarea className="w-full h-full p-2 min-h-[96px] resize-none focus:outline-none focus:bg-blue-50 text-sm text-left" placeholder="請輸入策略..." defaultValue={item.strategy}></textarea>
                      </td>
                      <td className="p-0 align-top">
                        <input type="text" className="w-full h-full p-2 text-center focus:outline-none focus:bg-blue-50 font-bold text-sm" defaultValue={item.grade} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        {/* Section 3 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">三、【教師增能規劃】</h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="font-bold text-gray-700 mb-2">可勾選之參考項目：</h3>
              <div className="h-64 overflow-y-auto border border-gray-300 p-4 rounded bg-gray-50">
                {referenceAnswers.section3.map((item, i) => (
                  <label key={i} className="flex items-start mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input
                      type="checkbox"
                      className="mt-1 mr-2"
                      checked={sec3Checked.includes(item)}
                      onChange={() => handleCheck('sec3', item)}
                    />
                    <span className="text-sm leading-relaxed">{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-700 mb-2">已選內容（可手動修改）：</h3>
              <textarea
                className="w-full border border-gray-400 p-4 h-64 resize-none focus:outline-none focus:border-blue-500 rounded-sm leading-loose"
                value={sec3Checked.map((item, idx) => `${idx + 1}、${item}`).join('\n')}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').map(line => line.replace(/^\d+、/, '').trim()).filter(Boolean);
                  setSec3Checked(lines);
                }}
              ></textarea>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">四、【學習扶助教學規劃】</h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="font-bold text-gray-700 mb-2">可勾選之參考項目：</h3>
              <div className="h-64 overflow-y-auto border border-gray-300 p-4 rounded bg-gray-50">
                {referenceAnswers.section4.map((item, i) => (
                  <label key={i} className="flex items-start mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input
                      type="checkbox"
                      className="mt-1 mr-2"
                      checked={sec4Checked.includes(item)}
                      onChange={() => handleCheck('sec4', item)}
                    />
                    <span className="text-sm leading-relaxed">{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-700 mb-2">已選內容（可手動修改）：</h3>
              <textarea
                className="w-full border border-gray-400 p-4 h-64 resize-none focus:outline-none focus:border-blue-500 rounded-sm leading-loose"
                value={sec4Checked.map((item, idx) => `${idx + 1}、${item}`).join('\n')}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').map(line => line.replace(/^\d+、/, '').trim()).filter(Boolean);
                  setSec4Checked(lines);
                }}
              ></textarea>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">五、其他因應措施</h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="font-bold text-gray-700 mb-2">可勾選之參考項目：</h3>
              <div className="h-64 overflow-y-auto border border-gray-300 p-4 rounded bg-gray-50">
                {referenceAnswers.section5.map((item, i) => (
                  <label key={i} className="flex items-start mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input
                      type="checkbox"
                      className="mt-1 mr-2"
                      checked={sec5Checked.includes(item)}
                      onChange={() => handleCheck('sec5', item)}
                    />
                    <span className="text-sm leading-relaxed">{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-700 mb-2">已選內容（可手動修改）：</h3>
              <textarea
                className="w-full border border-gray-400 p-4 h-64 resize-none focus:outline-none focus:border-blue-500 rounded-sm leading-loose"
                value={sec5Checked.map((item, idx) => `${idx + 1}、${item}`).join('\n')}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').map(line => line.replace(/^\d+、/, '').trim()).filter(Boolean);
                  setSec5Checked(lines);
                }}
              ></textarea>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default App;
