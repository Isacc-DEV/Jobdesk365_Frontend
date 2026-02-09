import { motion } from "framer-motion";

const STAGES = [
  { id: "discover", label: "Discover Jobs", x: 200, y: 40, delay: 0 },
  { id: "apply", label: "Apply Faster", x: 330, y: 120, delay: 0.3 },
  { id: "optimize", label: "Optimize Resume", x: 330, y: 280, delay: 0.6 },
  { id: "interview", label: "Interview Assist", x: 200, y: 360, delay: 0.9 },
  { id: "manage", label: "Manage Everything", x: 70, y: 280, delay: 1.2 },
  { id: "scale", label: "Scale Applications", x: 70, y: 120, delay: 1.5 }
];

const PRIMARY = "#2563EB";
const SOFT = "#93C5FD";
const NEUTRAL = "#E5E7EB";
const RING_RADIUS = 150;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const PROGRESS_DURATION = 10;
const PROGRESS_ARC_RATIO = 0.22;
const PROGRESS_ARC_LENGTH = RING_CIRCUMFERENCE * PROGRESS_ARC_RATIO;
const PROGRESS_GAP_LENGTH = RING_CIRCUMFERENCE - PROGRESS_ARC_LENGTH;
const STAGE_DOT_BASE_RADIUS = 18;
const STAGE_DOT_SCALE = 2;
const STAGE_DOT_RADIUS = STAGE_DOT_BASE_RADIUS * STAGE_DOT_SCALE;
const STAGE_IMAGE_CLIP_RADIUS = STAGE_DOT_RADIUS - 1.5;
const STAGE_IMAGE_RENDER_SIZE = STAGE_IMAGE_CLIP_RADIUS * 2;
const STAGE_IMAGE_RENDER_OFFSET = STAGE_IMAGE_RENDER_SIZE / 2;
const CENTER_IMAGE = "/images/7d94783c-5586-4b14-9a5e-a7c65e4f37c1.png";
const CENTER_NODE_RADIUS = STAGE_DOT_RADIUS + 10;
const CENTER_GLOW_RADIUS = CENTER_NODE_RADIUS + 12;
const CENTER_IMAGE_CLIP_RADIUS = CENTER_NODE_RADIUS - 1.5;
const CENTER_IMAGE_RENDER_SIZE = CENTER_IMAGE_CLIP_RADIUS * 2;
const CENTER_IMAGE_RENDER_OFFSET = CENTER_IMAGE_RENDER_SIZE / 2;
const STAGE_IMAGE_PATHS: Record<string, string> = {
  discover: "/images/e2c80a93-82ca-4e6f-a626-8c943f2f2983.png",
  apply: "/images/740ef3f4-b99c-4666-81a4-654f9abd463d.png",
  optimize: "/images/54cf9d0a-1780-4d98-8c94-5f4552ac5426.png",
  interview: "/images/e0487eed-97f1-4de9-8720-6dc152de6c72.png",
  manage: "/images/c3e8c0f3-de53-4260-bc3b-560076415f98.png",
  scale: "/images/4bb809a4-f504-4762-a8ff-6e1dc96ef163.png"
};

export const JobLifecycle = () => {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <motion.svg viewBox="0 0 400 400" className="h-full w-full">
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={SOFT} stopOpacity="0.6" />
            <stop offset="100%" stopColor={SOFT} stopOpacity="0" />
          </radialGradient>
          {STAGES.map((stage) => {
            if (!STAGE_IMAGE_PATHS[stage.id]) {
              return null;
            }
            return (
              <clipPath id={`stageImageClip-${stage.id}`} key={`clip-${stage.id}`}>
                <circle cx={stage.x} cy={stage.y} r={STAGE_IMAGE_CLIP_RADIUS} />
              </clipPath>
            );
          })}
          <clipPath id="centerImageClip">
            <circle cx="200" cy="200" r={CENTER_IMAGE_CLIP_RADIUS} />
          </clipPath>
        </defs>

        <circle cx="200" cy="200" r={RING_RADIUS} fill="none" stroke={NEUTRAL} strokeWidth="2" />
        <circle cx="200" cy="200" r="120" fill="none" stroke={SOFT} strokeOpacity="0.35" strokeWidth="1" />

        <motion.g
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: PROGRESS_DURATION, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "200px 200px" }}
        >
          <circle
            cx="200"
            cy="200"
            r={RING_RADIUS}
            fill="none"
            stroke={SOFT}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${PROGRESS_ARC_LENGTH} ${PROGRESS_GAP_LENGTH}`}
            transform="rotate(-90 200 200)"
          />
        </motion.g>

        <g>
          {STAGES.map((stage) => {
            const stageImage = STAGE_IMAGE_PATHS[stage.id];
            return (
              <g key={stage.id}>
                <motion.circle
                  cx={stage.x}
                  cy={stage.y}
                  r={STAGE_DOT_RADIUS}
                  fill={stageImage ? "#DBEAFE" : PRIMARY}
                  stroke={stageImage ? SOFT : "none"}
                  strokeWidth={stageImage ? "1.5" : "0"}
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: stage.delay }}
                />
                {stageImage ? (
                  <image
                    href={stageImage}
                    x={stage.x - STAGE_IMAGE_RENDER_OFFSET}
                    y={stage.y - STAGE_IMAGE_RENDER_OFFSET}
                    width={STAGE_IMAGE_RENDER_SIZE}
                    height={STAGE_IMAGE_RENDER_SIZE}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#stageImageClip-${stage.id})`}
                  />
                ) : null}
                <motion.circle
                  cx={stage.x}
                  cy={stage.y}
                  r="28"
                  fill="none"
                  stroke={SOFT}
                  strokeOpacity="0.5"
                  strokeWidth="2"
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: stage.delay }}
                />
                <text
                  x={stage.x}
                  y={stage.y + 36}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748B"
                  fontFamily="inherit"
                >
                  {stage.label}
                </text>
              </g>
            );
          })}
        </g>

        <circle cx="200" cy="200" r={CENTER_GLOW_RADIUS} fill="url(#centerGlow)" />
        <circle cx="200" cy="200" r={CENTER_NODE_RADIUS} fill="#DBEAFE" stroke={SOFT} strokeWidth="1.5" />
        <image
          href={CENTER_IMAGE}
          x={200 - CENTER_IMAGE_RENDER_OFFSET}
          y={200 - CENTER_IMAGE_RENDER_OFFSET}
          width={CENTER_IMAGE_RENDER_SIZE}
          height={CENTER_IMAGE_RENDER_SIZE}
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#centerImageClip)"
        />

        <circle cx="90" cy="70" r="3" fill={SOFT} opacity="0.3" />
        <circle cx="330" cy="60" r="2.5" fill={SOFT} opacity="0.25" />
        <circle cx="340" cy="320" r="3" fill={SOFT} opacity="0.25" />
        <circle cx="80" cy="320" r="2.5" fill={SOFT} opacity="0.3" />
      </motion.svg>
    </div>
  );
};
