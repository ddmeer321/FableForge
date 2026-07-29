"use client";

import type { CSSProperties } from "react";
import type { CharacterAppearance, CharacterPose, HairStyle } from "../../game/types";

function HairFront({ style }: { style: HairStyle }) {
  const paths: Record<HairStyle, string> = {
    crest: "M58,72 C62,34 78,14 95,14 C112,14 128,34 132,72 C124,52 116,66 108,58 C103,32 97,26 92,54 C86,34 80,42 76,60 C70,50 63,58 58,72 Z",
    round: "M49,84 C49,42 68,26 95,26 C122,26 141,42 141,84 C141,58 121,44 95,46 C69,44 49,58 49,84 Z",
    side: "M49,88 C53,46 76,32 116,36 C142,39 148,54 143,76 C126,54 104,52 92,60 C74,50 60,54 49,88 Z",
    short: "M53,74 C53,50 71,38 95,38 C119,38 137,50 137,74 C137,60 118,52 95,52 C72,52 53,60 53,74 Z",
  };
  return <path className="character-hair-front" d={paths[style]} />;
}

export function ModularCharacter({
  character,
  pose = "idle",
}: {
  character: CharacterAppearance & { name?: string };
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
    <svg
      className={`modular-character pose-${pose} hair-${character.hairStyle} accessory-${character.accessory}`}
      style={characterStyle}
      viewBox="0 0 190 352"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax meet"
      aria-label={`Ganzkörperansicht von ${character.name || "Held"}`}
      role="img"
    >
      <ellipse className="character-ground-shadow" cx={95} cy={344} rx={64} ry={10} />

      <path
        className="character-cape"
        d="M42,192 L148,192 L163,338 L119,317 L95,340 L71,317 L27,338 Z"
      />

      <circle className="character-hair-back" cx={95} cy={96} r={60} />

      <g className="character-leg leg-left">
        <rect x={54} y={270} width={36} height={60} rx={15} />
        <ellipse className="character-shoe" cx={72} cy={336} rx={24} ry={10} />
      </g>
      <g className="character-leg leg-right">
        <rect x={100} y={270} width={36} height={60} rx={15} />
        <ellipse className="character-shoe" cx={118} cy={336} rx={24} ry={10} />
      </g>

      <rect className="character-body" x={36} y={170} width={118} height={112} rx={42} />
      <path className="character-collar character-collar-left" d="M76,171 L59,157 L88,173 Z" />
      <path className="character-collar character-collar-right" d="M114,171 L131,157 L102,173 Z" />
      <ellipse className="character-badge character-collar-center" cx={95} cy={177} rx={13} ry={7} />
      <circle className="character-badge character-chest-button" cx={95} cy={198} r={8} />

      <rect className="character-neck" x={81} y={150} width={28} height={30} rx={9} />

      <g className="character-arm arm-left">
        <rect x={32} y={192} width={32} height={82} rx={16} />
        <circle className="character-hand" cx={48} cy={278} r={15} />
      </g>
      <g className="character-arm arm-right">
        <rect x={126} y={192} width={32} height={82} rx={16} />
        <circle className="character-hand" cx={142} cy={278} r={15} />
      </g>

      <circle className="character-shoulder shoulder-left" cx={48} cy={192} r={20} />
      <circle className="character-shoulder shoulder-right" cx={142} cy={192} r={20} />

      <g className="character-scarf">
        <ellipse cx={95} cy={186} rx={38} ry={14} />
        <rect x={116} y={186} width={18} height={68} rx={8} transform="rotate(14 116 186)" />
      </g>

      <circle className="character-ear ear-left" cx={38} cy={112} r={11} />
      <circle className="character-ear ear-right" cx={152} cy={112} r={11} />

      <circle className="character-head" cx={95} cy={106} r={56} />

      <circle className="character-eye eye-left" cx={75} cy={100} r={7} />
      <circle className="character-eye eye-right" cx={115} cy={100} r={7} />
      <path className="character-mouth" d="M82,123 Q95,135 108,123" />

      <HairFront style={character.hairStyle} />
    </svg>
  );
}
