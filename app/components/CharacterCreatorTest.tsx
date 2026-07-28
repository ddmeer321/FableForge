"use client";

import { useEffect, useState, type CSSProperties } from "react";

const STORAGE_KEY = "fableforge-character-test-v1";

type HairStyle = "crest" | "round" | "side" | "short";
type Accessory = "none" | "cape" | "scarf" | "shoulders";
type CharacterPose = "idle" | "battle" | "cheer";

export type CharacterDraft = {
  name: string;
  skinTone: string;
  eyeColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  topColor: string;
  accentColor: string;
  accessory: Accessory;
};

const DEFAULT_CHARACTER: CharacterDraft = {
  name: "Spieler 1",
  skinTone: "#e8aa7a",
  eyeColor: "#31242d",
  hairStyle: "crest",
  hairColor: "#a83b1c",
  topColor: "#d94a1d",
  accentColor: "#f2b13d",
  accessory: "cape",
};

const SKIN_TONES = ["#f4c9a3", "#e8aa7a", "#bd7956", "#88523f", "#52372f"];
const EYE_COLORS = ["#31242d", "#3f6d91", "#49835c", "#9b6435", "#76559e"];
const HAIR_COLORS = ["#241e26", "#6e3d29", "#a83b1c", "#d89a48", "#d7d1c7", "#564083"];
const TOP_COLORS = ["#d94a1d", "#2f73ae", "#3c8d69", "#7655a7", "#c43f62", "#d29432"];
const ACCENT_COLORS = ["#f2b13d", "#78d5cf", "#edd8a2", "#bd81ec", "#f28a72"];

const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: "crest", label: "Flamme" },
  { id: "round", label: "Rund" },
  { id: "side", label: "Seitlich" },
  { id: "short", label: "Kurz" },
];

const ACCESSORIES: { id: Accessory; label: string }[] = [
  { id: "none", label: "Keins" },
  { id: "cape", label: "Umhang" },
  { id: "scarf", label: "Schal" },
  { id: "shoulders", label: "Schultern" },
];

const POSES: { id: CharacterPose; label: string }[] = [
  { id: "idle", label: "Stehen" },
  { id: "battle", label: "Kampf" },
  { id: "cheer", label: "Jubel" },
];

function loadStoredCharacter() {
  if (typeof window === "undefined") return DEFAULT_CHARACTER;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_CHARACTER, ...JSON.parse(stored) } : DEFAULT_CHARACTER;
  } catch {
    return DEFAULT_CHARACTER;
  }
}

function ColorPicker({
  label,
  colors,
  value,
  onChange,
}: {
  label: string;
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <fieldset className="creator-fieldset">
      <legend>{label}</legend>
      <div className="creator-swatches">
        {colors.map((color, index) => (
          <button
            type="button"
            className={color === value ? "is-selected" : ""}
            style={{ "--swatch": color } as CSSProperties}
            aria-label={`${label} ${index + 1}`}
            aria-pressed={color === value}
            onClick={() => onChange(color)}
            key={color}
          >
            <span />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ModularCharacter({
  character,
  pose = "idle",
}: {
  character: CharacterDraft;
  pose?: CharacterPose;
}) {
  const characterStyle = {
    "--character-skin": character.skinTone,
    "--character-eyes": character.eyeColor,
    "--character-hair": character.hairColor,
    "--character-top": character.topColor,
    "--character-accent": character.accentColor,
  } as CSSProperties;

  return (
    <div
      className={`modular-character pose-${pose} hair-${character.hairStyle} accessory-${character.accessory}`}
      style={characterStyle}
      aria-label={`Ganzkörpervorschau von ${character.name || "Spieler 1"}`}
      role="img"
    >
      <span className="character-ground-shadow" />
      <span className="character-cape" />
      <span className="character-leg leg-left"><i /></span>
      <span className="character-leg leg-right"><i /></span>
      <span className="character-body" />
      <span className="character-belt"><i /></span>
      <span className="character-neck" />
      <span className="character-arm arm-left"><i /></span>
      <span className="character-arm arm-right"><i /></span>
      <span className="character-shoulder shoulder-left" />
      <span className="character-shoulder shoulder-right" />
      <span className="character-head">
        <i className="character-ear ear-left" />
        <i className="character-ear ear-right" />
        <i className="character-eye eye-left" />
        <i className="character-eye eye-right" />
        <i className="character-nose" />
        <i className="character-mouth" />
      </span>
      <span className="character-hair-back" />
      <span className="character-hair-front"><i /><b /></span>
      <span className="character-scarf" />
    </div>
  );
}

export function CharacterCreatorTest({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [character, setCharacter] = useState<CharacterDraft>(loadStoredCharacter);
  const [pose, setPose] = useState<CharacterPose>("idle");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const update = <K extends keyof CharacterDraft>(key: K, value: CharacterDraft[K]) => {
    setSaved(false);
    setCharacter((current) => ({ ...current, [key]: value }));
  };

  const saveCharacter = () => {
    const finalCharacter = {
      ...character,
      name: character.name.trim() || "Spieler 1",
    };
    setCharacter(finalCharacter);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(finalCharacter));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  const resetCharacter = () => {
    setCharacter(DEFAULT_CHARACTER);
    setPose("idle");
    setSaved(false);
  };

  return (
    <div className="character-creator-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="character-creator" role="dialog" aria-modal="true" aria-labelledby="character-creator-title">
        <header className="character-creator-header">
          <div>
            <span className="chapter-kicker">FRÜHER PROTOTYP</span>
            <h2 id="character-creator-title">Dein erster Abenteurer</h2>
            <p>Teste die einfachen Ganzkörper-Bauteile für den späteren Spielstart.</p>
          </div>
          <button className="creator-close" onClick={onClose} aria-label="Charaktererstellung schließen">×</button>
        </header>

        <div className="character-creator-content">
          <div className="creator-preview-panel">
            <div className="creator-preview-stage">
              <span className="preview-light" />
              <span className="preview-rune rune-one">✦</span>
              <span className="preview-rune rune-two">✧</span>
              <ModularCharacter character={character} pose={pose} />
            </div>
            <div className="creator-nameplate">
              <small>ABENTEURER</small>
              <strong>{character.name.trim() || "Spieler 1"}</strong>
            </div>
            <div className="creator-pose-picker" aria-label="Vorschaupose">
              {POSES.map((option) => (
                <button
                  type="button"
                  className={pose === option.id ? "is-selected" : ""}
                  aria-pressed={pose === option.id}
                  onClick={() => setPose(option.id)}
                  key={option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="creator-controls">
            <label className="creator-name-input">
              <span>Name</span>
              <input
                value={character.name}
                maxLength={18}
                placeholder="Spieler 1"
                onChange={(event) => update("name", event.target.value)}
              />
              <small>{character.name.length}/18</small>
            </label>

            <div className="creator-control-grid">
              <ColorPicker label="Hautfarbe" colors={SKIN_TONES} value={character.skinTone} onChange={(value) => update("skinTone", value)} />
              <ColorPicker label="Augenfarbe" colors={EYE_COLORS} value={character.eyeColor} onChange={(value) => update("eyeColor", value)} />
              <ColorPicker label="Haarfarbe" colors={HAIR_COLORS} value={character.hairColor} onChange={(value) => update("hairColor", value)} />
              <ColorPicker label="Oberteil" colors={TOP_COLORS} value={character.topColor} onChange={(value) => update("topColor", value)} />
              <ColorPicker label="Akzentfarbe" colors={ACCENT_COLORS} value={character.accentColor} onChange={(value) => update("accentColor", value)} />
            </div>

            <fieldset className="creator-fieldset creator-choice-fieldset">
              <legend>Frisur</legend>
              <div className="creator-choice-row">
                {HAIR_STYLES.map((style) => (
                  <button
                    type="button"
                    className={character.hairStyle === style.id ? "is-selected" : ""}
                    aria-pressed={character.hairStyle === style.id}
                    onClick={() => update("hairStyle", style.id)}
                    key={style.id}
                  >
                    <i className={`hair-choice-icon hair-${style.id}`} />
                    {style.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="creator-fieldset creator-choice-fieldset">
              <legend>Ein Accessoire</legend>
              <div className="creator-choice-row accessory-choices">
                {ACCESSORIES.map((accessory) => (
                  <button
                    type="button"
                    className={character.accessory === accessory.id ? "is-selected" : ""}
                    aria-pressed={character.accessory === accessory.id}
                    onClick={() => update("accessory", accessory.id)}
                    key={accessory.id}
                  >
                    {accessory.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <footer className="character-creator-footer">
          <button className="creator-reset" onClick={resetCharacter}>ZURÜCKSETZEN</button>
          <span className={saved ? "creator-save-note is-visible" : "creator-save-note"}>
            {saved ? "✓ Testfigur auf diesem Gerät gespeichert" : "Dies ist noch kein endgültiger Spielcharakter."}
          </span>
          <button className="creator-save" onClick={saveCharacter}>
            {saved ? "GESPEICHERT" : "TESTFIGUR SPEICHERN"}
          </button>
        </footer>
      </section>
    </div>
  );
}
