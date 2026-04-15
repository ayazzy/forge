/**
 * Generate a production brief PDF for a completed episode.
 * 7 sections: cover, script with timestamps, storyboard, sound cues, metadata, thumbnail concepts, production notes.
 */

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const ACCENT = '#e03535';
const DARK = '#111111';
const MID = '#555555';
const LIGHT = '#888888';
const BORDER = '#cccccc';

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function accentRgb() { return hexToRgb(ACCENT); }

// ─── Layout helpers ───────────────────────────────────────────────────────────

class PDFBuilder {
  constructor(doc) {
    this.doc = doc;
    this.y = MARGIN;
    this.page = 1;
  }

  checkBreak(needed = 10) {
    if (this.y + needed > PAGE_H - MARGIN) {
      this.doc.addPage();
      this.page++;
      this.y = MARGIN + 6;
      this.addPageNumber();
    }
  }

  addPageNumber() {
    this.doc.setFontSize(8);
    this.doc.setTextColor(180, 180, 180);
    this.doc.text(`${this.page}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }

  rule(color = BORDER) {
    const [r, g, b] = hexToRgb(color);
    this.doc.setDrawColor(r, g, b);
    this.doc.setLineWidth(0.3);
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
    this.y += 4;
  }

  sectionHeading(text) {
    this.checkBreak(14);
    const [r, g, b] = accentRgb();
    this.doc.setFillColor(r, g, b);
    this.doc.rect(MARGIN, this.y, CONTENT_W, 8, 'F');
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(text.toUpperCase(), MARGIN + 3, this.y + 5.5);
    this.y += 12;
    this.doc.setTextColor(0, 0, 0);
  }

  subHeading(text) {
    this.checkBreak(10);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(40, 40, 40);
    this.doc.text(text, MARGIN, this.y);
    this.y += 6;
  }

  body(text, color = MID) {
    if (!text) return;
    const [r, g, b] = hexToRgb(color);
    this.doc.setFontSize(8.5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(r, g, b);
    const lines = this.doc.splitTextToSize(text, CONTENT_W);
    for (const line of lines) {
      this.checkBreak(5.5);
      this.doc.text(line, MARGIN, this.y);
      this.y += 5;
    }
    this.y += 1;
  }

  label(text) {
    this.doc.setFontSize(7.5);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(140, 140, 140);
    this.doc.text(text.toUpperCase(), MARGIN, this.y);
    this.y += 4.5;
  }

  tableRow(cols, widths, isHeader = false) {
    this.checkBreak(7);
    const [r, g, b] = isHeader ? [240, 240, 240] : [255, 255, 255];
    this.doc.setFillColor(r, g, b);
    this.doc.rect(MARGIN, this.y - 1, CONTENT_W, 6.5, 'F');
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
    this.doc.setTextColor(isHeader ? 60 : 80, isHeader ? 60 : 80, isHeader ? 60 : 80);
    let x = MARGIN + 1;
    cols.forEach((col, i) => {
      const w = widths[i];
      this.doc.text(String(col || '').substring(0, Math.floor(w * 3)), x, this.y + 3.5);
      x += w;
    });
    this.y += 6.5;
  }
}

// ─── Section renderers ─────────────────────────────────────────────────────────

function renderCover(b, data) {
  const doc = b.doc;

  // Red top bar
  const [r, g, bl] = accentRgb();
  doc.setFillColor(r, g, bl);
  doc.rect(0, 0, PAGE_W, 48, 'F');

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FORGE', MARGIN, 28);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 200, 200);
  doc.text('Production Brief', MARGIN, 38);

  b.y = 60;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  const titleText = data.meta?.titles?.[0]?.text || data.topic || 'Untitled Episode';
  const titleLines = doc.splitTextToSize(titleText, CONTENT_W);
  titleLines.forEach(line => { doc.text(line, MARGIN, b.y); b.y += 10; });

  b.y += 4;

  const info = [
    ['Channel', data.channelProfile?.channel_name || '—'],
    ['Episode', data.episode || '—'],
    ['Duration', data.analysis ? `${data.analysis.minutes}:${String(data.analysis.seconds || 0).padStart(2, '0')}` : '—'],
    ['Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
  ];
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  for (const [k, v] of info) {
    doc.setTextColor(140, 140, 140);
    doc.text(k, MARGIN, b.y);
    doc.setTextColor(40, 40, 40);
    doc.text(String(v), MARGIN + 30, b.y);
    b.y += 7;
  }

  b.y += 10;
  b.rule();

  // TOC
  b.subHeading('Contents');
  const toc = [
    '1.  Script with Timestamps',
    '2.  Storyboard (Image Prompts)',
    '3.  Sound Design Cues',
    '4.  YouTube Metadata',
    '5.  Thumbnail Concepts',
  ];
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  for (const item of toc) {
    b.checkBreak(6);
    doc.text(item, MARGIN + 4, b.y);
    b.y += 6;
  }
}

function renderScript(b, data) {
  b.sectionHeading('1. Script with Timestamps');
  if (!data.script) { b.body('No script available.'); return; }

  const wpm = data.channelProfile?.prompt_config?.wordsPerMinute || 150;
  const secPerWord = 60 / wpm;
  let cumulativeWords = 0;

  const paragraphs = data.script.split(/\n\n+/).filter(p => p.trim().length > 10);
  const segs = data.voiceSegments || paragraphs.map((text, i) => ({ text: text.trim(), voiceId: null }));

  for (const seg of segs) {
    const text = (seg.text || '').trim();
    if (!text) continue;
    const words = text.split(/\s+/).filter(Boolean);
    const startSec = Math.round(cumulativeWords * secPerWord);
    const mm = Math.floor(startSec / 60);
    const ss = String(startSec % 60).padStart(2, '0');
    const timestamp = `${mm}:${ss}`;

    b.checkBreak(14);

    // Timestamp label
    b.doc.setFontSize(7.5);
    b.doc.setFont('helvetica', 'bold');
    const [r, g, bl] = accentRgb();
    b.doc.setTextColor(r, g, bl);
    b.doc.text(timestamp, MARGIN, b.y);

    b.doc.setFontSize(8.5);
    b.doc.setFont('helvetica', 'normal');
    b.doc.setTextColor(60, 60, 60);
    const lines = b.doc.splitTextToSize(text, CONTENT_W - 14);
    for (const line of lines) {
      b.checkBreak(5.5);
      b.doc.text(line, MARGIN + 14, b.y);
      b.y += 5;
    }
    b.y += 3;

    cumulativeWords += words.length;
  }
}

function renderStoryboard(b, data) {
  b.sectionHeading('2. Storyboard — Image Prompts');
  const prompts = data.imagePrompts || [];
  if (!prompts.length) { b.body('No image prompts generated.'); return; }

  b.tableRow(['#', 'Mood', 'Why', 'Prompt'], [8, 22, 44, CONTENT_W - 74], true);
  for (const p of prompts) {
    b.checkBreak(8);
    const cols = [
      String(p.imageNumber || ''),
      (p.mood || '').substring(0, 14),
      (p.why || '').substring(0, 40),
      (p.prompt || '').replace(/--\w+\s+\S+/g, '').trim().substring(0, 80),
    ];
    b.tableRow(cols, [8, 22, 44, CONTENT_W - 74]);
  }
}

function renderSoundCues(b, data) {
  b.sectionHeading('3. Sound Design Cues');
  const soundData = data.soundDesign;
  if (!soundData) { b.body('No sound design cues generated yet. Complete Stage 3 to populate this section.'); return; }

  if (soundData.musicBed) {
    b.subHeading('Music Bed');
    b.body(`${soundData.musicBed.description || ''}  |  Mood: ${soundData.musicBed.mood || '—'}  |  Tempo: ${soundData.musicBed.tempo || '—'}`);
    b.y += 2;
  }
  if (soundData.ambient) {
    b.subHeading('Ambient Layer');
    b.body(`${soundData.ambient.description || ''}  |  Environment: ${soundData.ambient.environment || '—'}`);
    b.y += 2;
  }
  if (soundData.sfx?.length) {
    b.subHeading('Sound Effects');
    b.tableRow(['Time', 'Description', 'Cue'], [20, 60, CONTENT_W - 80], true);
    for (const sfx of soundData.sfx) {
      b.tableRow([sfx.timestamp || '', sfx.description || '', sfx.cue || ''], [20, 60, CONTENT_W - 80]);
    }
  }
}

function renderMetadata(b, data) {
  b.sectionHeading('4. YouTube Metadata');
  const meta = data.meta;
  if (!meta) { b.body('No metadata generated yet.'); return; }

  if (meta.titles?.length) {
    b.subHeading('Title Options');
    for (const t of meta.titles) {
      b.checkBreak(10);
      b.doc.setFontSize(8.5);
      b.doc.setFont('helvetica', 'bold');
      b.doc.setTextColor(40, 40, 40);
      b.doc.text(`[${t.option}] ${t.text || ''}`, MARGIN, b.y);
      b.y += 5;
      if (t.angle) {
        b.doc.setFont('helvetica', 'italic');
        b.doc.setTextColor(130, 130, 130);
        b.doc.setFontSize(7.5);
        b.doc.text(`  ${t.angle}`, MARGIN, b.y);
        b.y += 5;
      }
    }
    b.y += 2;
  }

  if (meta.description) {
    b.subHeading('Description');
    b.body(meta.description);
    b.y += 2;
  }

  if (meta.tags?.length) {
    b.subHeading('Tags');
    b.body(meta.tags.join(', '));
    b.y += 2;
  }

  if (meta.chapters?.length) {
    b.subHeading('Chapters');
    b.tableRow(['Time', 'Title'], [20, CONTENT_W - 20], true);
    for (const c of meta.chapters) {
      b.tableRow([c.time || '', c.title || ''], [20, CONTENT_W - 20]);
    }
  }
}

function renderThumbnailConcepts(b, data) {
  b.sectionHeading('5. Thumbnail Concepts');
  const concepts = data.thumbnailConcepts || data.selectedConcept ? [data.selectedConcept] : [];
  const all = data.thumbnailConcepts || (data.selectedConcept ? [data.selectedConcept] : []);
  if (!all.length) { b.body('No thumbnail concepts generated.'); return; }

  for (const c of all) {
    if (!c) continue;
    b.checkBreak(28);
    b.subHeading(c.approach || 'Concept');

    // Colour swatches
    if (c.colorPalette) {
      const swatches = [
        ['BG', c.colorPalette.bg],
        ['Text', c.colorPalette.textPrimary],
        ['Accent', c.colorPalette.textAccent],
      ];
      let sx = MARGIN;
      for (const [label, hex] of swatches) {
        if (!hex) continue;
        try {
          const [r, g, bl] = hexToRgb(hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex);
          b.doc.setFillColor(r, g, bl);
          b.doc.rect(sx, b.y, 8, 4, 'F');
          b.doc.setFontSize(6.5);
          b.doc.setTextColor(100, 100, 100);
          b.doc.text(label, sx, b.y + 7);
          sx += 14;
        } catch {}
      }
      b.y += 10;
    }

    b.label('Headline');
    b.body(c.headline || '—', DARK);
    if (c.subtext) { b.label('Subtext'); b.body(c.subtext, MID); }
    b.label('Image Prompt');
    b.body(c.imagePrompt || '—');
    if (c.notes) { b.label('Why it works'); b.body(c.notes, LIGHT); }
    b.y += 4;
    b.rule();
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateProductionBriefPDF(data) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const b = new PDFBuilder(doc);

  // Page 1: Cover
  renderCover(b, data);
  b.addPageNumber();

  // Page 2+: Script
  doc.addPage();
  b.page++;
  b.y = MARGIN;
  b.addPageNumber();
  renderScript(b, data);

  // Storyboard
  doc.addPage();
  b.page++;
  b.y = MARGIN;
  b.addPageNumber();
  renderStoryboard(b, data);

  // Sound cues
  doc.addPage();
  b.page++;
  b.y = MARGIN;
  b.addPageNumber();
  renderSoundCues(b, data);

  // Metadata
  doc.addPage();
  b.page++;
  b.y = MARGIN;
  b.addPageNumber();
  renderMetadata(b, data);

  // Thumbnail concepts
  doc.addPage();
  b.page++;
  b.y = MARGIN;
  b.addPageNumber();
  renderThumbnailConcepts(b, data);

  const epLabel = data.episode ? `ep${data.episode}` : 'episode';
  doc.save(`${epLabel}_production_brief.pdf`);
}
