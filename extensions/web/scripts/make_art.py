"""
Generate Robot-Game's SVG art in the imadestuff neon-on-dark robot style.

Palette (from art-library/ROBOT-CREATION-GUIDE.md):
  pink #ff92d0, blue #8be9fd, purple #bd93f9, green #50fa7b, orange #ffb86c, dark #0d0d1a

Outputs into public/assets/art/:
  - enemies/*.svg   (5 hostile bots, red/orange aggressive palette)
  - tiles/floor-*.svg, wall-*.svg, door-*.svg  (station tiles, 64x64)
  - junk/*.svg      (10 mineable debris types, 64x64)
  - items/mining-laser.svg, weapon-upgrade.svg, loot.svg, heal-station.svg
Player bots are copied separately from the blog's robot partials.
"""
import os

PINK = "#ff92d0"
BLUE = "#8be9fd"
PURPLE = "#bd93f9"
GREEN = "#50fa7b"
ORANGE = "#ffb86c"
DARK = "#0d0d1a"
RED = "#ff5555"

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "art")


def write(path, svg):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(svg.strip() + "\n")
    print("wrote", path)


def svg_open(w, h, extra=""):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'width="{w}" height="{h}" aria-hidden="true" role="img">{extra}'
    )


GLOW = (
    '<filter id="{i}-glow"><feGaussianBlur stdDeviation="2" result="b"/>'
    '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
)


# ---------------------------------------------------------------- ENEMIES
# Five hostile bots, 300x360 viewBox, aggressive red/orange accents over the
# blue/purple chassis so they read as "enemy" against the friendly player bots.

def enemy_sentry():
    """Corrupted Sentry: boxy head, single red cyclops eye, turret arms."""
    i = "e1"
    return svg_open(300, 360, f'<defs>{GLOW.format(i=i)}'
        f'<linearGradient id="{i}-b" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0%" stop-color="{BLUE}"/><stop offset="100%" stop-color="{PURPLE}"/>'
        '</linearGradient></defs>') + f'''
  <line x1="150" y1="42" x2="150" y2="18" stroke="{RED}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="150" cy="13" r="6" fill="{RED}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite"/></circle>
  <rect x="108" y="42" width="84" height="54" rx="4" fill="url(#{i}-b)" stroke="{RED}" stroke-width="2"/>
  <circle cx="150" cy="68" r="20" fill="{DARK}" stroke="{RED}" stroke-width="2"/>
  <circle cx="150" cy="68" r="13" fill="{RED}" filter="url(#{i}-glow)" opacity="0.9"/>
  <circle cx="150" cy="68" r="5" fill="{DARK}"/>
  <rect x="80" y="100" width="140" height="95" rx="8" fill="url(#{i}-b)" stroke="{RED}" stroke-width="2"/>
  <rect x="100" y="115" width="100" height="40" rx="4" fill="{DARK}" stroke="{ORANGE}" stroke-width="1.5"/>
  <rect x="106" y="122" width="14" height="26" fill="{RED}" opacity="0.5"/>
  <rect x="124" y="122" width="14" height="26" fill="{ORANGE}" opacity="0.5"/>
  <rect x="142" y="122" width="14" height="26" fill="{RED}" opacity="0.5"/>
  <circle cx="175" cy="135" r="6" fill="{RED}" filter="url(#{i}-glow)"/>
  <!-- hazard stripes -->
  <path d="M90,170 l20,0 l-10,18 l-20,0 z" fill="{ORANGE}" opacity="0.6"/>
  <path d="M120,170 l20,0 l-10,18 l-20,0 z" fill="{ORANGE}" opacity="0.6"/>
  <!-- turret arms -->
  <rect x="48" y="120" width="34" height="16" rx="4" fill="{PURPLE}" stroke="{RED}" stroke-width="1"/>
  <rect x="40" y="128" width="16" height="12" rx="2" fill="{DARK}" stroke="{RED}" stroke-width="2"/>
  <rect x="218" y="120" width="34" height="16" rx="4" fill="{PURPLE}" stroke="{RED}" stroke-width="1"/>
  <rect x="244" y="128" width="16" height="12" rx="2" fill="{DARK}" stroke="{RED}" stroke-width="2"/>
  <rect x="110" y="200" width="30" height="55" rx="5" fill="url(#{i}-b)" stroke="{RED}" stroke-width="1"/>
  <rect x="160" y="200" width="30" height="55" rx="5" fill="url(#{i}-b)" stroke="{RED}" stroke-width="1"/>
  <rect x="102" y="250" width="44" height="16" rx="5" fill="{PURPLE}"/>
  <rect x="154" y="250" width="44" height="16" rx="5" fill="{PURPLE}"/>
</svg>'''


def enemy_drone():
    """Haywire Drone: floating orb with rotor fins, erratic."""
    i = "e2"
    return svg_open(300, 300, f'<defs>{GLOW.format(i=i)}'
        f'<radialGradient id="{i}-o" cx="40%" cy="35%" r="60%">'
        f'<stop offset="0%" stop-color="{BLUE}"/><stop offset="100%" stop-color="{PURPLE}"/>'
        '</radialGradient></defs>') + f'''
  <!-- rotor bar -->
  <rect x="40" y="70" width="220" height="8" rx="4" fill="{PURPLE}" opacity="0.7"/>
  <ellipse cx="55" cy="74" rx="26" ry="8" fill="{ORANGE}" opacity="0.4"/>
  <ellipse cx="245" cy="74" rx="26" ry="8" fill="{ORANGE}" opacity="0.4"/>
  <line x1="150" y1="78" x2="150" y2="110" stroke="{PURPLE}" stroke-width="4"/>
  <!-- orb body -->
  <circle cx="150" cy="170" r="62" fill="url(#{i}-o)" stroke="{RED}" stroke-width="2"/>
  <circle cx="150" cy="170" r="62" fill="none" stroke="{ORANGE}" stroke-width="1" opacity="0.4"/>
  <!-- angry eye band -->
  <rect x="104" y="150" width="92" height="26" rx="13" fill="{DARK}" stroke="{RED}" stroke-width="2"/>
  <circle cx="128" cy="163" r="8" fill="{RED}" filter="url(#{i}-glow)"/>
  <circle cx="172" cy="163" r="8" fill="{RED}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.4;1" dur="0.6s" repeatCount="indefinite"/></circle>
  <!-- warning light -->
  <circle cx="150" cy="205" r="7" fill="{ORANGE}" filter="url(#{i}-glow)"/>
  <circle cx="98" cy="150" r="3" fill="{PURPLE}"/>
  <circle cx="202" cy="150" r="3" fill="{PURPLE}"/>
  <!-- thruster -->
  <path d="M135,228 l30,0 l-8,24 l-14,0 z" fill="{ORANGE}" opacity="0.7">
    <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.4s" repeatCount="indefinite"/></path>
</svg>'''


def enemy_program():
    """Rogue Program: wireframe/holographic body, no solid chassis."""
    i = "e3"
    return svg_open(300, 360, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <line x1="150" y1="40" x2="150" y2="16" stroke="{RED}" stroke-width="2"/>
  <circle cx="150" cy="12" r="5" fill="{RED}" filter="url(#{i}-glow)"/>
  <!-- translucent boxy head -->
  <rect x="112" y="40" width="76" height="56" rx="4" fill="{RED}" opacity="0.12" stroke="{RED}" stroke-width="1.5"/>
  <rect x="124" y="58" width="22" height="16" rx="2" fill="{RED}" filter="url(#{i}-glow)" opacity="0.8"/>
  <rect x="154" y="58" width="22" height="16" rx="2" fill="{RED}" filter="url(#{i}-glow)" opacity="0.8">
    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.5s" repeatCount="indefinite"/></rect>
  <!-- wireframe body -->
  <rect x="88" y="104" width="124" height="104" rx="6" fill="{PURPLE}" opacity="0.1" stroke="{RED}" stroke-width="1.5"/>
  <line x1="88" y1="104" x2="212" y2="208" stroke="{RED}" stroke-width="0.6" opacity="0.5"/>
  <line x1="212" y1="104" x2="88" y2="208" stroke="{RED}" stroke-width="0.6" opacity="0.5"/>
  <line x1="150" y1="104" x2="150" y2="208" stroke="{ORANGE}" stroke-width="0.6" opacity="0.5"/>
  <line x1="88" y1="156" x2="212" y2="156" stroke="{ORANGE}" stroke-width="0.6" opacity="0.5"/>
  <!-- energy core -->
  <circle cx="150" cy="156" r="18" fill="{RED}" filter="url(#{i}-glow)" opacity="0.6">
    <animate attributeName="r" values="14;20;14" dur="1.5s" repeatCount="indefinite"/></circle>
  <circle cx="150" cy="156" r="7" fill="#fff" opacity="0.7"/>
  <!-- ghostly limbs -->
  <line x1="88" y1="120" x2="52" y2="180" stroke="{RED}" stroke-width="3" opacity="0.5" stroke-linecap="round"/>
  <line x1="212" y1="120" x2="248" y2="180" stroke="{RED}" stroke-width="3" opacity="0.5" stroke-linecap="round"/>
  <line x1="120" y1="208" x2="110" y2="300" stroke="{RED}" stroke-width="3" opacity="0.5" stroke-linecap="round"/>
  <line x1="180" y1="208" x2="190" y2="300" stroke="{RED}" stroke-width="3" opacity="0.5" stroke-linecap="round"/>
</svg>'''


def enemy_crawler():
    """Scrap Crawler: low spider-mech with many legs."""
    i = "e4"
    legs = ""
    for lx in (70, 95, 120):
        legs += f'<line x1="{lx}" y1="150" x2="{lx-35}" y2="210" stroke="{PURPLE}" stroke-width="5" stroke-linecap="round"/>'
        legs += f'<line x1="{lx-35}" y1="210" x2="{lx-45}" y2="260" stroke="{BLUE}" stroke-width="4" stroke-linecap="round"/>'
    for rx in (180, 205, 230):
        legs += f'<line x1="{rx}" y1="150" x2="{rx+35}" y2="210" stroke="{PURPLE}" stroke-width="5" stroke-linecap="round"/>'
        legs += f'<line x1="{rx+35}" y1="210" x2="{rx+45}" y2="260" stroke="{BLUE}" stroke-width="4" stroke-linecap="round"/>'
    return svg_open(300, 300, f'<defs>{GLOW.format(i=i)}'
        f'<linearGradient id="{i}-b" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0%" stop-color="{BLUE}"/><stop offset="100%" stop-color="{PURPLE}"/>'
        '</linearGradient></defs>') + f'''
  {legs}
  <ellipse cx="150" cy="140" rx="80" ry="48" fill="url(#{i}-b)" stroke="{RED}" stroke-width="2"/>
  <ellipse cx="150" cy="120" rx="60" ry="24" fill="{DARK}" opacity="0.4"/>
  <!-- cluster of red eyes -->
  <circle cx="128" cy="128" r="7" fill="{RED}" filter="url(#{i}-glow)"/>
  <circle cx="150" cy="122" r="7" fill="{RED}" filter="url(#{i}-glow)"/>
  <circle cx="172" cy="128" r="7" fill="{RED}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="0.7s" repeatCount="indefinite"/></circle>
  <circle cx="139" cy="140" r="5" fill="{ORANGE}" filter="url(#{i}-glow)"/>
  <circle cx="161" cy="140" r="5" fill="{ORANGE}" filter="url(#{i}-glow)"/>
  <!-- mandibles -->
  <path d="M130,165 l-10,22" stroke="{RED}" stroke-width="3" stroke-linecap="round"/>
  <path d="M170,165 l10,22" stroke="{RED}" stroke-width="3" stroke-linecap="round"/>
</svg>'''


def enemy_hunter():
    """Rocket Hunter: aggressive rocket-shaped bot that charges."""
    i = "e5"
    return svg_open(300, 360, f'<defs>{GLOW.format(i=i)}'
        f'<linearGradient id="{i}-b" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0%" stop-color="{BLUE}"/><stop offset="100%" stop-color="{PURPLE}"/>'
        '</linearGradient></defs>') + f'''
  <!-- nose cone -->
  <path d="M150,24 C124,56 112,96 112,120 l76,0 C188,96 176,56 150,24 Z"
        fill="url(#{i}-b)" stroke="{RED}" stroke-width="2"/>
  <circle cx="150" cy="40" r="6" fill="{RED}" filter="url(#{i}-glow)"/>
  <!-- body -->
  <rect x="104" y="120" width="92" height="120" rx="10" fill="url(#{i}-b)" stroke="{RED}" stroke-width="2"/>
  <!-- visor -->
  <rect x="116" y="134" width="68" height="20" rx="10" fill="{DARK}" stroke="{RED}" stroke-width="1.5"/>
  <rect x="120" y="138" width="60" height="12" rx="6" fill="{RED}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.4;1" dur="0.7s" repeatCount="indefinite"/></rect>
  <!-- racing stripe + warning -->
  <rect x="140" y="160" width="20" height="70" fill="{ORANGE}" opacity="0.6"/>
  <circle cx="150" cy="185" r="8" fill="{RED}" filter="url(#{i}-glow)"/>
  <!-- fins -->
  <path d="M104,200 l-34,30 l34,0 z" fill="{PURPLE}" stroke="{RED}" stroke-width="1"/>
  <path d="M196,200 l34,30 l-34,0 z" fill="{PURPLE}" stroke="{RED}" stroke-width="1"/>
  <!-- exhaust -->
  <path d="M126,240 l48,0 l-10,44 l-28,0 z" fill="{ORANGE}" opacity="0.8">
    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.3s" repeatCount="indefinite"/></path>
  <path d="M138,240 l24,0 l-6,60 l-12,0 z" fill="{RED}" opacity="0.7"/>
</svg>'''


# ---------------------------------------------------------------- TILES (64x64)

def tile(bg, draw, i):
    return svg_open(64, 64) + f'<rect width="64" height="64" fill="{bg}"/>{draw}</svg>'


def floor_plated():
    # riveted plating
    d = f'<rect x="2" y="2" width="60" height="60" fill="none" stroke="{BLUE}" stroke-width="1" opacity="0.25"/>'
    for cx in (12, 52):
        for cy in (12, 52):
            d += f'<circle cx="{cx}" cy="{cy}" r="2" fill="{PURPLE}" opacity="0.4"/>'
    d += f'<line x1="32" y1="4" x2="32" y2="60" stroke="{BLUE}" stroke-width="0.6" opacity="0.15"/>'
    d += f'<line x1="4" y1="32" x2="60" y2="32" stroke="{BLUE}" stroke-width="0.6" opacity="0.15"/>'
    return tile("#14141f", d, "f1")


def floor_grid():
    # tech grid with faint green trace
    d = ""
    for g in range(8, 64, 16):
        d += f'<line x1="{g}" y1="0" x2="{g}" y2="64" stroke="{BLUE}" stroke-width="0.5" opacity="0.18"/>'
        d += f'<line x1="0" y1="{g}" x2="64" y2="{g}" stroke="{BLUE}" stroke-width="0.5" opacity="0.18"/>'
    d += f'<path d="M8,40 L24,40 L24,24 L40,24" fill="none" stroke="{GREEN}" stroke-width="1" opacity="0.3"/>'
    d += f'<circle cx="40" cy="24" r="2" fill="{GREEN}" opacity="0.4"/>'
    return tile("#101019", d, "f2")


def floor_hazard():
    # diamond-plate industrial with corner hazard dashes
    d = ""
    for x in range(0, 64, 16):
        for y in range(0, 64, 16):
            d += f'<path d="M{x+4},{y+8} l4,-4 l4,4 l-4,4 z" fill="{PURPLE}" opacity="0.18"/>'
    d += f'<rect x="0" y="0" width="64" height="4" fill="{ORANGE}" opacity="0.25"/>'
    return tile("#17141a", d, "f3")


def wall(base, accent, i):
    d = f'<rect x="3" y="3" width="58" height="58" rx="3" fill="none" stroke="{accent}" stroke-width="1.5" opacity="0.5"/>'
    d += f'<rect x="0" y="0" width="64" height="7" fill="{accent}" opacity="0.5"/>'
    d += f'<circle cx="10" cy="54" r="2.5" fill="{accent}" opacity="0.6"/>'
    d += f'<circle cx="54" cy="54" r="2.5" fill="{accent}" opacity="0.6"/>'
    return tile(base, d, i)


def door(accent, i):
    d = f'<rect x="0" y="0" width="64" height="64" fill="#101019"/>'
    d += f'<rect x="10" y="6" width="44" height="52" rx="6" fill="{DARK}" stroke="{accent}" stroke-width="3"/>'
    d += f'<line x1="32" y1="8" x2="32" y2="56" stroke="{accent}" stroke-width="2" opacity="0.7"/>'
    d += f'<rect x="26" y="28" width="12" height="8" rx="2" fill="{accent}" opacity="0.6"/>'
    return svg_open(64, 64) + d + "</svg>"


# ---------------------------------------------------------------- JUNK (64x64, mineable)

def junk(body_colors, shapes, i):
    """Generic chunky debris: a cluster of angular shards."""
    defs = f'<defs>{GLOW.format(i=i)}</defs>'
    return svg_open(64, 64, defs) + shapes + "</svg>"


def junk_set():
    """Return list of (name, svg) for 10 distinct mineable junk types."""
    out = []

    def poly(points, fill, stroke, sw=1.5, op=1.0):
        pts = " ".join(f"{x},{y}" for x, y in points)
        return f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}"/>'

    # 1 scrap metal shards (blue/purple)
    out.append(("scrap", junk(None,
        poly([(14, 40), (26, 18), (34, 34), (22, 50)], BLUE, PURPLE) +
        poly([(30, 46), (44, 24), (52, 42), (40, 54)], PURPLE, BLUE), "j1")))
    # 2 circuit board chunk (green traces)
    out.append(("circuit", junk(None,
        f'<rect x="16" y="18" width="32" height="30" rx="3" fill="{DARK}" stroke="{GREEN}" stroke-width="1.5"/>' +
        f'<line x1="20" y1="26" x2="44" y2="26" stroke="{GREEN}" stroke-width="1" opacity="0.6"/>' +
        f'<line x1="20" y1="34" x2="36" y2="34" stroke="{GREEN}" stroke-width="1" opacity="0.6"/>' +
        f'<circle cx="40" cy="40" r="3" fill="{GREEN}" opacity="0.7"/>' +
        f'<rect x="22" y="38" width="6" height="6" fill="{PURPLE}" opacity="0.6"/>', "j2")))
    # 3 power cell (orange glow)
    out.append(("cell", junk(None,
        f'<defs>{GLOW.format(i="j3")}</defs>'.replace("<svg", "") if False else
        f'<rect x="24" y="16" width="16" height="34" rx="4" fill="{DARK}" stroke="{ORANGE}" stroke-width="2"/>' +
        f'<rect x="27" y="20" width="10" height="26" rx="2" fill="{ORANGE}" opacity="0.6"/>' +
        f'<rect x="29" y="12" width="6" height="5" fill="{ORANGE}"/>', "j3")))
    # 4 crystal cluster (pink)
    out.append(("crystal", junk(None,
        poly([(32, 10), (40, 40), (24, 40)], PINK, "#fff", 1, 0.85) +
        poly([(20, 24), (28, 48), (14, 48)], PINK, "#fff", 1, 0.7) +
        poly([(44, 24), (50, 48), (38, 48)], PINK, "#fff", 1, 0.7), "j4")))
    # 5 hull fragment (big grey/blue slab)
    out.append(("hull", junk(None,
        poly([(12, 44), (20, 20), (46, 16), (52, 46), (30, 52)], BLUE, PURPLE, 2) +
        f'<line x1="22" y1="24" x2="44" y2="22" stroke="{DARK}" stroke-width="1" opacity="0.4"/>', "j5")))
    # 6 bolt pile
    out.append(("bolts", junk(None,
        "".join(poly(
            [(cx, cy - 6), (cx + 5, cy - 3), (cx + 5, cy + 3), (cx, cy + 6), (cx - 5, cy + 3), (cx - 5, cy - 3)],
            PURPLE, BLUE, 1) for cx, cy in [(24, 28), (40, 24), (32, 42), (46, 40)]), "j6")))
    # 7 broken gear
    out.append(("gear", junk(None,
        f'<circle cx="32" cy="32" r="16" fill="none" stroke="{BLUE}" stroke-width="5"/>' +
        f'<circle cx="32" cy="32" r="6" fill="{DARK}" stroke="{PURPLE}" stroke-width="2"/>' +
        "".join(f'<rect x="{30}" y="{8}" width="4" height="7" fill="{BLUE}" transform="rotate({a} 32 32)"/>'
                for a in range(0, 360, 45)), "j7")))
    # 8 glowing ore vein (green crystal in rock)
    out.append(("ore", junk(None,
        poly([(14, 42), (22, 20), (44, 18), (50, 44), (30, 52)], "#2a2a38", PURPLE, 1.5) +
        poly([(28, 38), (34, 26), (40, 38), (34, 46)], GREEN, "#fff", 1, 0.8), "j8")))
    # 9 cracked plating
    out.append(("plating", junk(None,
        f'<rect x="14" y="18" width="36" height="28" rx="3" fill="{PURPLE}" stroke="{BLUE}" stroke-width="2" opacity="0.9"/>' +
        f'<path d="M20,20 L34,34 L28,46" fill="none" stroke="{DARK}" stroke-width="2"/>' +
        f'<path d="M44,22 L36,32" fill="none" stroke="{DARK}" stroke-width="1.5"/>', "j9")))
    # 10 fuel canister (orange, dented)
    out.append(("canister", junk(None,
        f'<ellipse cx="32" cy="46" rx="14" ry="5" fill="{PURPLE}" opacity="0.5"/>' +
        f'<rect x="20" y="18" width="24" height="28" rx="6" fill="{DARK}" stroke="{ORANGE}" stroke-width="2"/>' +
        f'<rect x="24" y="24" width="16" height="6" fill="{ORANGE}" opacity="0.6"/>' +
        f'<circle cx="32" cy="38" r="4" fill="{ORANGE}" opacity="0.5"/>', "j10")))
    return out


# ---------------------------------------------------------------- SPECIAL ITEMS

def mining_laser():
    i = "ml"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="14" y="26" width="30" height="14" rx="4" fill="{PURPLE}" stroke="{BLUE}" stroke-width="2"/>
  <rect x="42" y="29" width="14" height="8" rx="2" fill="{DARK}" stroke="{ORANGE}" stroke-width="1.5"/>
  <circle cx="54" cy="33" r="3" fill="{ORANGE}" filter="url(#{i}-glow)"/>
  <rect x="18" y="20" width="8" height="8" rx="2" fill="{BLUE}"/>
  <line x1="56" y1="33" x2="63" y2="33" stroke="{ORANGE}" stroke-width="2" opacity="0.7" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="0.7;0.2;0.7" dur="0.6s" repeatCount="indefinite"/></line>
  <circle cx="22" cy="33" r="3" fill="{GREEN}" filter="url(#{i}-glow)"/>
</svg>'''


def weapon_upgrade():
    i = "wu"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="18" y="14" width="28" height="36" rx="5" fill="{DARK}" stroke="{PINK}" stroke-width="2"/>
  <path d="M32,20 l8,14 l-6,0 l6,12 l-14,-16 l6,0 z" fill="{PINK}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite"/></path>
  <circle cx="24" cy="44" r="2" fill="{BLUE}"/>
  <circle cx="40" cy="44" r="2" fill="{BLUE}"/>
</svg>'''


def loot():
    i = "lt"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <ellipse cx="32" cy="46" rx="16" ry="5" fill="{PURPLE}" opacity="0.4"/>
  <rect x="20" y="22" width="24" height="22" rx="4" fill="{PURPLE}" stroke="{ORANGE}" stroke-width="2"/>
  <rect x="20" y="22" width="24" height="7" rx="3" fill="{ORANGE}" opacity="0.7"/>
  <circle cx="32" cy="36" r="4" fill="{GREEN}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite"/></circle>
</svg>'''


def keycard():
    i = "kc"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="14" y="20" width="36" height="24" rx="3" fill="#241b40" stroke="{ORANGE}" stroke-width="2"/>
  <rect x="18" y="24" width="14" height="10" rx="1" fill="{ORANGE}" opacity="0.7"/>
  <circle cx="42" cy="29" r="3" fill="{GREEN}" filter="url(#{i}-glow)"/>
  <line x1="18" y1="38" x2="46" y2="38" stroke="{BLUE}" stroke-width="1.5" opacity="0.6"/>
  <rect x="44" y="22" width="4" height="20" rx="1" fill="{PINK}" opacity="0.8"/>
</svg>'''


def ship_component():
    i = "sc"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <circle cx="32" cy="32" r="18" fill="#1b2740" stroke="{GREEN}" stroke-width="2"/>
  <circle cx="32" cy="32" r="9" fill="{GREEN}" filter="url(#{i}-glow)" opacity="0.7">
    <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.4s" repeatCount="indefinite"/></circle>
  <rect x="30" y="8" width="4" height="8" fill="{BLUE}"/>
  <rect x="30" y="48" width="4" height="8" fill="{BLUE}"/>
  <rect x="8" y="30" width="8" height="4" fill="{BLUE}"/>
  <rect x="48" y="30" width="8" height="4" fill="{BLUE}"/>
</svg>'''


def install_point():
    i = "ip"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="12" y="12" width="40" height="40" rx="4" fill="#16161f" stroke="{PINK}" stroke-width="2" stroke-dasharray="4 3"/>
  <circle cx="32" cy="32" r="10" fill="none" stroke="{PINK}" stroke-width="2" opacity="0.7">
    <animate attributeName="r" values="8;12;8" dur="1.6s" repeatCount="indefinite"/></circle>
  <path d="M32,24 L32,40 M24,32 L40,32" stroke="{PINK}" stroke-width="2" opacity="0.8"/>
</svg>'''


def projectile():
    i = "pj"
    return svg_open(32, 32, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <ellipse cx="16" cy="16" rx="12" ry="4" fill="{PINK}" filter="url(#{i}-glow)"/>
  <circle cx="16" cy="16" r="4" fill="#fff" opacity="0.9"/>
</svg>'''


def recipe_chip():
    i = "rcp"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="16" y="14" width="32" height="36" rx="4" fill="{DARK}" stroke="{GREEN}" stroke-width="2"/>
  <rect x="22" y="12" width="20" height="6" rx="2" fill="{GREEN}" opacity="0.7"/>
  <line x1="22" y1="26" x2="42" y2="26" stroke="{GREEN}" stroke-width="1.5" opacity="0.7"/>
  <line x1="22" y1="32" x2="42" y2="32" stroke="{BLUE}" stroke-width="1.5" opacity="0.6"/>
  <line x1="22" y1="38" x2="36" y2="38" stroke="{BLUE}" stroke-width="1.5" opacity="0.6"/>
  <circle cx="40" cy="44" r="3" fill="{PINK}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite"/></circle>
</svg>'''


def heal_station():
    i = "hs"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="10" y="8" width="44" height="48" rx="5" fill="#16161f" stroke="{GREEN}" stroke-width="2"/>
  <rect x="16" y="14" width="32" height="24" rx="3" fill="{DARK}" stroke="{GREEN}" stroke-width="1"/>
  <rect x="28" y="18" width="8" height="16" fill="{GREEN}" filter="url(#{i}-glow)"/>
  <rect x="24" y="24" width="16" height="4" fill="{GREEN}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.4;1" dur="1.4s" repeatCount="indefinite"/></rect>
  <circle cx="22" cy="46" r="3" fill="{PINK}"/>
  <circle cx="42" cy="46" r="3" fill="{ORANGE}"/>
</svg>'''


# ---------------------------------------------------------------- THEMED PROPS (64x64)
# Room-signature furniture, drawn in the same neon-on-dark palette so each room reads as its
# function (control stations, telescopes, servers, reactors, bunks, etc.).

def prop(i, inner):
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + inner + "</svg>"


def prop_control_station():
    i = "pcs"
    return prop(i, f'''
  <rect x="10" y="30" width="44" height="22" rx="3" fill="#1b2740" stroke="{BLUE}" stroke-width="2"/>
  <rect x="14" y="14" width="36" height="18" rx="2" fill="{DARK}" stroke="{GREEN}" stroke-width="1.5"/>
  <line x1="18" y1="20" x2="46" y2="20" stroke="{GREEN}" stroke-width="1" opacity="0.6"/>
  <line x1="18" y1="25" x2="38" y2="25" stroke="{GREEN}" stroke-width="1" opacity="0.5"/>
  <circle cx="18" cy="42" r="3" fill="{PINK}" filter="url(#{i}-glow)"/>
  <circle cx="28" cy="42" r="3" fill="{GREEN}" filter="url(#{i}-glow)"/>
  <circle cx="38" cy="42" r="3" fill="{ORANGE}"/>
  <rect x="42" y="39" width="8" height="6" rx="1" fill="{PURPLE}"/>''')


def prop_telescope():
    i = "ptel"
    return prop(i, f'''
  <ellipse cx="32" cy="52" rx="16" ry="5" fill="{PURPLE}" opacity="0.5"/>
  <rect x="28" y="36" width="8" height="16" fill="{PURPLE}"/>
  <g transform="rotate(-35 32 34)">
    <rect x="18" y="26" width="34" height="14" rx="7" fill="#2a2e3a" stroke="{BLUE}" stroke-width="2"/>
    <circle cx="50" cy="33" r="8" fill="{DARK}" stroke="{PINK}" stroke-width="2"/>
    <circle cx="50" cy="33" r="4" fill="{PINK}" filter="url(#{i}-glow)"/>
  </g>''')


def prop_window():
    i = "pwin"
    return prop(i, f'''
  <rect x="8" y="10" width="48" height="44" rx="6" fill="#0a0a16" stroke="{BLUE}" stroke-width="3"/>
  <line x1="32" y1="12" x2="32" y2="52" stroke="{BLUE}" stroke-width="1.5" opacity="0.5"/>
  <line x1="10" y1="32" x2="54" y2="32" stroke="{BLUE}" stroke-width="1.5" opacity="0.5"/>
  <circle cx="20" cy="22" r="1.5" fill="#fff" opacity="0.8"/>
  <circle cx="44" cy="26" r="1" fill="#fff" opacity="0.7"/>
  <circle cx="38" cy="42" r="1.5" fill="{PINK}" opacity="0.8"/>
  <circle cx="24" cy="44" r="1" fill="#fff" opacity="0.6"/>''')


def prop_server():
    i = "psrv"
    rows = "".join(
        f'<rect x="16" y="{y}" width="32" height="5" rx="1" fill="{DARK}"/>'
        f'<circle cx="21" cy="{y+2}" r="1.5" fill="{GREEN}"/>'
        f'<circle cx="26" cy="{y+2}" r="1.5" fill="{PINK}"/>'
        for y in range(14, 50, 8))
    return prop(i, f'''
  <rect x="12" y="8" width="40" height="48" rx="3" fill="#1b2740" stroke="{BLUE}" stroke-width="2"/>
  {rows}''')


def prop_reactor():
    i = "prc"
    return prop(i, f'''
  <rect x="22" y="10" width="20" height="44" rx="4" fill="#241b40" stroke="{PURPLE}" stroke-width="2"/>
  <circle cx="32" cy="32" r="12" fill="{GREEN}" filter="url(#{i}-glow)" opacity="0.7">
    <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.6s" repeatCount="indefinite"/></circle>
  <circle cx="32" cy="32" r="5" fill="#fff" opacity="0.8"/>
  <rect x="18" y="20" width="4" height="24" fill="{ORANGE}" opacity="0.5"/>
  <rect x="42" y="20" width="4" height="24" fill="{ORANGE}" opacity="0.5"/>''')


def prop_bunk():
    i = "pbnk"
    return prop(i, f'''
  <rect x="10" y="30" width="44" height="18" rx="3" fill="#2a2e3a" stroke="{BLUE}" stroke-width="2"/>
  <rect x="12" y="26" width="18" height="8" rx="3" fill="{PURPLE}"/>
  <rect x="10" y="20" width="6" height="28" fill="{BLUE}"/>
  <rect x="48" y="20" width="6" height="28" fill="{BLUE}"/>
  <line x1="16" y1="38" x2="50" y2="38" stroke="{DARK}" stroke-width="1" opacity="0.4"/>''')


def prop_docking_clamp():
    i = "pdk"
    return prop(i, f'''
  <rect x="26" y="8" width="12" height="40" fill="{PURPLE}" stroke="{BLUE}" stroke-width="1.5"/>
  <path d="M26,16 L10,24 L10,40 L26,32 Z" fill="#2a2e3a" stroke="{ORANGE}" stroke-width="1.5"/>
  <path d="M38,16 L54,24 L54,40 L38,32 Z" fill="#2a2e3a" stroke="{ORANGE}" stroke-width="1.5"/>
  <circle cx="32" cy="50" r="5" fill="{ORANGE}" filter="url(#{i}-glow)"/>''')


def prop_antenna():
    i = "pant"
    return prop(i, f'''
  <ellipse cx="32" cy="54" rx="14" ry="5" fill="{PURPLE}" opacity="0.5"/>
  <line x1="32" y1="54" x2="32" y2="30" stroke="{BLUE}" stroke-width="3"/>
  <path d="M14,30 Q32,6 50,30 Z" fill="#1b2740" stroke="{BLUE}" stroke-width="2" opacity="0.8"/>
  <line x1="32" y1="30" x2="32" y2="14" stroke="{PINK}" stroke-width="2"/>
  <circle cx="32" cy="12" r="4" fill="{PINK}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="1.3s" repeatCount="indefinite"/></circle>''')


def prop_cargo_stack():
    i = "pcar"
    return prop(i, f'''
  <rect x="10" y="34" width="20" height="18" rx="2" fill="{ORANGE}" stroke="{DARK}" stroke-width="1.5" opacity="0.85"/>
  <rect x="32" y="34" width="20" height="18" rx="2" fill="{BLUE}" stroke="{DARK}" stroke-width="1.5" opacity="0.85"/>
  <rect x="21" y="14" width="22" height="20" rx="2" fill="{PURPLE}" stroke="{DARK}" stroke-width="1.5" opacity="0.9"/>
  <line x1="21" y1="24" x2="43" y2="24" stroke="{DARK}" stroke-width="1" opacity="0.5"/>''')


def main():
    write("enemies/sentry.svg", enemy_sentry())
    write("enemies/drone.svg", enemy_drone())
    write("enemies/program.svg", enemy_program())
    write("enemies/crawler.svg", enemy_crawler())
    write("enemies/hunter.svg", enemy_hunter())

    write("tiles/floor-plated.svg", floor_plated())
    write("tiles/floor-grid.svg", floor_grid())
    write("tiles/floor-hazard.svg", floor_hazard())
    write("tiles/wall-blue.svg", wall("#1b2740", BLUE, "w1"))
    write("tiles/wall-purple.svg", wall("#241b40", PURPLE, "w2"))
    write("tiles/wall-steel.svg", wall("#2a2e3a", "#9aa4bd", "w3"))
    write("tiles/wall-rust.svg", wall("#3a2320", ORANGE, "w4"))
    write("tiles/door-blue.svg", door(BLUE, "d1"))
    write("tiles/door-green.svg", door(GREEN, "d2"))
    write("tiles/door-orange.svg", door(ORANGE, "d3"))

    for name, svg in junk_set():
        write(f"junk/{name}.svg", svg)

    write("items/mining-laser.svg", mining_laser())
    write("items/weapon-upgrade.svg", weapon_upgrade())
    write("items/loot.svg", loot())
    write("items/heal-station.svg", heal_station())
    write("items/recipe.svg", recipe_chip())
    write("items/keycard.svg", keycard())
    write("items/component.svg", ship_component())
    write("items/install-point.svg", install_point())
    write("items/projectile.svg", projectile())

    write("props/control-station.svg", prop_control_station())
    write("props/telescope.svg", prop_telescope())
    write("props/window.svg", prop_window())
    write("props/server.svg", prop_server())
    write("props/reactor.svg", prop_reactor())
    write("props/bunk.svg", prop_bunk())
    write("props/docking-clamp.svg", prop_docking_clamp())
    write("props/antenna.svg", prop_antenna())
    write("props/cargo-stack.svg", prop_cargo_stack())
    # Generic decorative props reused across rooms.
    write("props/crate.svg", prop_cargo_stack())
    write("props/console.svg", prop_control_station())
    write("props/tank.svg", prop_reactor())
    write("props/pipe.svg", prop("ppipe",
        f'<rect x="4" y="26" width="56" height="12" rx="6" fill="#2a2e3a" stroke="{BLUE}" stroke-width="2"/>'
        f'<circle cx="16" cy="32" r="3" fill="{ORANGE}"/><circle cx="48" cy="32" r="3" fill="{ORANGE}"/>'))

    make_future_assets()

    print("done")


# ================================================================================================
# FUTURE / EXPANSION ASSETS
# Everything below is for planned content beyond v3. Kept in its own subfolders so it doesn't mix
# with the shipping art. Same neon-on-dark palette and GLOW helper. Call make_future_assets() from
# main() (already wired). Wire a given asset into the game via src/render/textures.ts when used.
# ================================================================================================

# Boss accent: bosses read as larger, more menacing versions of the enemy palette. We lean on a
# deep-red core with orange hazard trim over the blue/purple chassis.
BOSS_RED = "#ff5566"


def _poly(points, fill, stroke, sw=1.5, op=1.0):
    pts = " ".join(f"{x},{y}" for x, y in points)
    return f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}"/>'


# ---------------------------------------------------------------- GUARDIAN BOSSES (7)
# 360x420 viewBox: bigger than the 300x360 enemies so they tower in-fight. Each is themed to the
# ship component it guards. Shared chassis helper keeps them a family; the "head" varies per theme.

def _boss_frame(i, head_svg, core_color=BOSS_RED, extra=""):
    """Common guardian body: heavy torso, hazard trim, stubby legs, a glowing core, plus a
    per-guardian head drawn on top."""
    return svg_open(360, 420, f'<defs>{GLOW.format(i=i)}'
        f'<linearGradient id="{i}-b" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0%" stop-color="{BLUE}"/><stop offset="100%" stop-color="{PURPLE}"/>'
        '</linearGradient></defs>') + f'''
  <!-- shoulders / torso -->
  <rect x="70" y="150" width="220" height="150" rx="16" fill="url(#{i}-b)" stroke="{BOSS_RED}" stroke-width="3"/>
  <rect x="60" y="150" width="40" height="110" rx="10" fill="{PURPLE}" stroke="{BOSS_RED}" stroke-width="2"/>
  <rect x="260" y="150" width="40" height="110" rx="10" fill="{PURPLE}" stroke="{BOSS_RED}" stroke-width="2"/>
  <!-- hazard chest trim -->
  <path d="M95,170 l24,0 l-12,20 l-24,0 z" fill="{ORANGE}" opacity="0.6"/>
  <path d="M135,170 l24,0 l-12,20 l-24,0 z" fill="{ORANGE}" opacity="0.6"/>
  <path d="M205,170 l24,0 l-12,20 l-24,0 z" fill="{ORANGE}" opacity="0.6"/>
  <path d="M245,170 l24,0 l-12,20 l-24,0 z" fill="{ORANGE}" opacity="0.6"/>
  <!-- glowing core -->
  <circle cx="180" cy="235" r="30" fill="{DARK}" stroke="{core_color}" stroke-width="3"/>
  <circle cx="180" cy="235" r="20" fill="{core_color}" filter="url(#{i}-glow)" opacity="0.85">
    <animate attributeName="opacity" values="0.85;0.4;0.85" dur="1.3s" repeatCount="indefinite"/></circle>
  <circle cx="180" cy="235" r="7" fill="#fff" opacity="0.8"/>
  <!-- arms + fists -->
  <rect x="34" y="250" width="34" height="26" rx="6" fill="{DARK}" stroke="{BOSS_RED}" stroke-width="2"/>
  <rect x="292" y="250" width="34" height="26" rx="6" fill="{DARK}" stroke="{BOSS_RED}" stroke-width="2"/>
  <!-- legs -->
  <rect x="110" y="300" width="48" height="70" rx="8" fill="url(#{i}-b)" stroke="{BOSS_RED}" stroke-width="2"/>
  <rect x="202" y="300" width="48" height="70" rx="8" fill="url(#{i}-b)" stroke="{BOSS_RED}" stroke-width="2"/>
  <rect x="98" y="366" width="72" height="22" rx="6" fill="{PURPLE}"/>
  <rect x="190" y="366" width="72" height="22" rx="6" fill="{PURPLE}"/>
  {head_svg}
  {extra}
</svg>'''


def boss_reactor():
    """Guardian of the reactor core: molten, pulsing core-head."""
    i = "gb1"
    head = f'''
  <circle cx="180" cy="95" r="48" fill="{DARK}" stroke="{ORANGE}" stroke-width="3"/>
  <circle cx="180" cy="95" r="30" fill="{ORANGE}" filter="url(#{i}-glow)" opacity="0.8">
    <animate attributeName="r" values="26;34;26" dur="1.4s" repeatCount="indefinite"/></circle>
  <circle cx="180" cy="95" r="10" fill="#fff" opacity="0.9"/>
  <line x1="180" y1="47" x2="180" y2="24" stroke="{ORANGE}" stroke-width="3"/>
  <circle cx="180" cy="20" r="6" fill="{ORANGE}" filter="url(#{i}-glow)"/>'''
    return _boss_frame(i, head, ORANGE)


def boss_nav():
    """Guardian of the nav array: antenna-dish head."""
    i = "gb2"
    head = f'''
  <path d="M132,110 Q180,40 228,110 Z" fill="#1b2740" stroke="{BLUE}" stroke-width="3" opacity="0.9"/>
  <line x1="180" y1="110" x2="180" y2="58" stroke="{BLUE}" stroke-width="3"/>
  <circle cx="180" cy="52" r="8" fill="{BOSS_RED}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="0.9s" repeatCount="indefinite"/></circle>
  <rect x="150" y="104" width="60" height="18" rx="6" fill="{DARK}" stroke="{BOSS_RED}" stroke-width="2"/>
  <circle cx="165" cy="113" r="4" fill="{BOSS_RED}"/><circle cx="195" cy="113" r="4" fill="{BOSS_RED}"/>'''
    return _boss_frame(i, head)


def boss_life():
    """Guardian of life support: domed tank-head with gauges."""
    i = "gb3"
    head = f'''
  <rect x="140" y="56" width="80" height="66" rx="30" fill="url(#{i}-b)" stroke="{BOSS_RED}" stroke-width="3"/>
  <rect x="152" y="80" width="56" height="22" rx="11" fill="{DARK}" stroke="{GREEN}" stroke-width="2"/>
  <circle cx="168" cy="91" r="6" fill="{BOSS_RED}" filter="url(#{i}-glow)"/>
  <circle cx="192" cy="91" r="6" fill="{BOSS_RED}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite"/></circle>
  <circle cx="150" cy="66" r="5" fill="{GREEN}"/><circle cx="210" cy="66" r="5" fill="{GREEN}"/>'''
    return _boss_frame(i, head, GREEN)


def boss_comms():
    """Guardian of comms: multi-antenna broadcast head."""
    i = "gb4"
    head = f'''
  <rect x="146" y="60" width="68" height="60" rx="8" fill="url(#{i}-b)" stroke="{BOSS_RED}" stroke-width="3"/>
  <rect x="158" y="78" width="44" height="22" rx="4" fill="{DARK}" stroke="{PINK}" stroke-width="2"/>
  <rect x="164" y="84" width="32" height="10" rx="3" fill="{BOSS_RED}" filter="url(#{i}-glow)"/>
  <line x1="155" y1="60" x2="138" y2="30" stroke="{PINK}" stroke-width="3"/>
  <line x1="205" y1="60" x2="222" y2="30" stroke="{PINK}" stroke-width="3"/>
  <circle cx="138" cy="26" r="5" fill="{PINK}" filter="url(#{i}-glow)"/>
  <circle cx="222" cy="26" r="5" fill="{PINK}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/></circle>'''
    return _boss_frame(i, head, PINK)


def boss_thruster():
    """Guardian of the thrusters: exhaust-nozzle head, burning."""
    i = "gb5"
    head = f'''
  <path d="M146,58 l68,0 l-14,64 l-40,0 z" fill="url(#{i}-b)" stroke="{BOSS_RED}" stroke-width="3"/>
  <rect x="156" y="72" width="48" height="20" rx="10" fill="{DARK}" stroke="{BOSS_RED}" stroke-width="2"/>
  <rect x="162" y="78" width="36" height="8" rx="4" fill="{BOSS_RED}" filter="url(#{i}-glow)"/>
  <path d="M160,122 l40,0 l-8,30 l-24,0 z" fill="{ORANGE}" opacity="0.8">
    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.4s" repeatCount="indefinite"/></path>'''
    return _boss_frame(i, head, ORANGE)


def boss_shield():
    """Guardian of the shield emitter: heavy plated shield-head."""
    i = "gb6"
    head = f'''
  <path d="M180,52 C150,58 136,74 136,104 C136,124 180,132 180,132 C180,132 224,124 224,104 C224,74 210,58 180,52 Z"
        fill="url(#{i}-b)" stroke="{BLUE}" stroke-width="3"/>
  <path d="M180,66 C162,70 152,80 152,100 C152,114 180,120 180,120 Z" fill="{BLUE}" opacity="0.25"/>
  <rect x="160" y="88" width="40" height="16" rx="8" fill="{DARK}" stroke="{BOSS_RED}" stroke-width="2"/>
  <rect x="166" y="92" width="28" height="8" rx="4" fill="{BOSS_RED}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.4;1" dur="1.1s" repeatCount="indefinite"/></rect>'''
    return _boss_frame(i, head, BLUE)


def boss_flight():
    """Guardian of the flight computer: cube-head dense with circuitry."""
    i = "gb7"
    head = f'''
  <rect x="140" y="56" width="80" height="66" rx="6" fill="{DARK}" stroke="{GREEN}" stroke-width="3"/>
  <line x1="150" y1="70" x2="210" y2="70" stroke="{GREEN}" stroke-width="1" opacity="0.6"/>
  <line x1="150" y1="82" x2="195" y2="82" stroke="{GREEN}" stroke-width="1" opacity="0.5"/>
  <line x1="150" y1="94" x2="205" y2="94" stroke="{GREEN}" stroke-width="1" opacity="0.5"/>
  <rect x="152" y="100" width="56" height="16" rx="3" fill="#0a0a16" stroke="{BOSS_RED}" stroke-width="1.5"/>
  <circle cx="166" cy="108" r="5" fill="{BOSS_RED}" filter="url(#{i}-glow)"/>
  <circle cx="194" cy="108" r="5" fill="{BOSS_RED}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="0.7s" repeatCount="indefinite"/></circle>'''
    return _boss_frame(i, head, GREEN)


# ---------------------------------------------------------------- MAJOR BOSS (2 phases)
# The station core. 420x480 viewBox, the biggest sprite in the game. Phase 1 = intact,
# Phase 2 = cracked/overclocked (matches the half-health phase transition in data/bosses.ts).

def _major_boss(i, phase2=False):
    crack = ""
    aura = ORANGE if not phase2 else BOSS_RED
    if phase2:
        crack = f'''
  <path d="M150,150 L190,210 L160,250 L210,300" fill="none" stroke="{BOSS_RED}" stroke-width="3" opacity="0.8"/>
  <path d="M280,160 L250,220 L290,260" fill="none" stroke="{BOSS_RED}" stroke-width="2.5" opacity="0.7"/>
  <path d="M210,120 L230,160" fill="none" stroke="{ORANGE}" stroke-width="2" opacity="0.7"/>'''
    pulse = "0.6s" if phase2 else "1.4s"
    return svg_open(420, 480, f'<defs>{GLOW.format(i=i)}'
        f'<radialGradient id="{i}-core" cx="50%" cy="50%" r="50%">'
        f'<stop offset="0%" stop-color="#fff"/><stop offset="45%" stop-color="{aura}"/>'
        f'<stop offset="100%" stop-color="{DARK}"/></radialGradient>'
        f'<linearGradient id="{i}-b" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0%" stop-color="{BLUE}"/><stop offset="100%" stop-color="{PURPLE}"/>'
        '</linearGradient></defs>') + f'''
  <!-- outer frame ring -->
  <circle cx="210" cy="240" r="150" fill="none" stroke="{PURPLE}" stroke-width="6" opacity="0.5"/>
  <circle cx="210" cy="240" r="150" fill="none" stroke="{aura}" stroke-width="2" opacity="0.6"
          stroke-dasharray="20 14">
    <animateTransform attributeName="transform" type="rotate" from="0 210 240" to="360 210 240"
      dur="{'5s' if phase2 else '12s'}" repeatCount="indefinite"/></circle>
  <!-- armored shell octagon -->
  {_poly([(150,110),(270,110),(330,180),(330,300),(270,370),(150,370),(90,300),(90,180)],
         f"url(#{i}-b)", BOSS_RED, 4)}
  <!-- hazard shoulder vents -->
  <rect x="96" y="200" width="30" height="80" rx="6" fill="{DARK}" stroke="{aura}" stroke-width="2"/>
  <rect x="294" y="200" width="30" height="80" rx="6" fill="{DARK}" stroke="{aura}" stroke-width="2"/>
  <rect x="102" y="212" width="18" height="12" fill="{aura}" opacity="0.6"/>
  <rect x="102" y="232" width="18" height="12" fill="{aura}" opacity="0.6"/>
  <rect x="102" y="252" width="18" height="12" fill="{aura}" opacity="0.6"/>
  <rect x="300" y="212" width="18" height="12" fill="{aura}" opacity="0.6"/>
  <rect x="300" y="232" width="18" height="12" fill="{aura}" opacity="0.6"/>
  <rect x="300" y="252" width="18" height="12" fill="{aura}" opacity="0.6"/>
  <!-- the core eye -->
  <circle cx="210" cy="240" r="62" fill="{DARK}" stroke="{aura}" stroke-width="4"/>
  <circle cx="210" cy="240" r="48" fill="url(#{i}-core)" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.5;1" dur="{pulse}" repeatCount="indefinite"/></circle>
  <circle cx="210" cy="240" r="16" fill="#fff" opacity="0.9"/>
  <!-- brow / crown sensors -->
  <rect x="150" y="122" width="120" height="16" rx="8" fill="{DARK}" stroke="{aura}" stroke-width="2"/>
  <circle cx="172" cy="130" r="5" fill="{aura}" filter="url(#{i}-glow)"/>
  <circle cx="210" cy="130" r="5" fill="{aura}" filter="url(#{i}-glow)"/>
  <circle cx="248" cy="130" r="5" fill="{aura}" filter="url(#{i}-glow)"/>
  {crack}
</svg>'''


def major_boss_phase1():
    return _major_boss("mb1", phase2=False)


def major_boss_phase2():
    return _major_boss("mb2", phase2=True)


# ---------------------------------------------------------------- SHIP COMPONENTS (7 unique, 64x64)
# Replaces the single generic component.svg with one icon per mission component. Green "powered"
# glow stays consistent so they read as "a ship system," but the silhouette differs per component.

def _component(i, inner, glow_color=GREEN):
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <circle cx="32" cy="32" r="22" fill="#10151f" stroke="{glow_color}" stroke-width="1.5" opacity="0.4"/>
  {inner}
</svg>'''


def comp_reactor_core():
    i = "cmp1"
    return _component(i, f'''
  <circle cx="32" cy="32" r="14" fill="#241b1a" stroke="{ORANGE}" stroke-width="2"/>
  <circle cx="32" cy="32" r="7" fill="{ORANGE}" filter="url(#{i}-glow)">
    <animate attributeName="r" values="5;9;5" dur="1.3s" repeatCount="indefinite"/></circle>
  <circle cx="32" cy="32" r="3" fill="#fff"/>''', ORANGE)


def comp_nav_array():
    i = "cmp2"
    return _component(i, f'''
  <path d="M18,42 Q32,14 46,42 Z" fill="#1b2740" stroke="{BLUE}" stroke-width="2"/>
  <line x1="32" y1="42" x2="32" y2="20" stroke="{BLUE}" stroke-width="2"/>
  <circle cx="32" cy="18" r="4" fill="{GREEN}" filter="url(#{i}-glow)"/>''', BLUE)


def comp_life_support():
    i = "cmp3"
    return _component(i, f'''
  <rect x="22" y="18" width="20" height="28" rx="10" fill="#15241b" stroke="{GREEN}" stroke-width="2"/>
  <path d="M32,24 l0,16 M26,32 l12,0" stroke="{GREEN}" stroke-width="3" filter="url(#{i}-glow)"/>''', GREEN)


def comp_comms_relay():
    i = "cmp4"
    return _component(i, f'''
  <circle cx="32" cy="36" r="4" fill="{PINK}" filter="url(#{i}-glow)"/>
  <path d="M32,36 Q24,28 24,18 M32,36 Q40,28 40,18" fill="none" stroke="{PINK}" stroke-width="2"/>
  <path d="M20,34 A16,16 0 0 1 44,34" fill="none" stroke="{BLUE}" stroke-width="1.5" opacity="0.6"/>''', PINK)


def comp_thruster():
    i = "cmp5"
    return _component(i, f'''
  <path d="M26,18 l12,0 l4,18 l-20,0 z" fill="#1b2740" stroke="{BLUE}" stroke-width="2"/>
  <path d="M24,36 l16,0 l-5,12 l-6,0 z" fill="{ORANGE}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.4;1" dur="0.5s" repeatCount="indefinite"/></path>''', ORANGE)


def comp_shield_emitter():
    i = "cmp6"
    return _component(i, f'''
  <path d="M32,16 C24,19 20,24 20,34 C20,42 32,48 32,48 C32,48 44,42 44,34 C44,24 40,19 32,16 Z"
        fill="#1b2740" stroke="{BLUE}" stroke-width="2"/>
  <path d="M32,24 C28,26 26,29 26,34 C26,38 32,42 32,42 Z" fill="{BLUE}" filter="url(#{i}-glow)" opacity="0.7"/>''', BLUE)


def comp_flight_computer():
    i = "cmp7"
    return _component(i, f'''
  <rect x="20" y="20" width="24" height="24" rx="3" fill="#0a0a16" stroke="{GREEN}" stroke-width="2"/>
  <line x1="24" y1="27" x2="40" y2="27" stroke="{GREEN}" stroke-width="1.5" opacity="0.7"/>
  <line x1="24" y1="32" x2="36" y2="32" stroke="{GREEN}" stroke-width="1.5" opacity="0.6"/>
  <circle cx="38" cy="38" r="3" fill="{GREEN}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/></circle>''', GREEN)


def make_future_assets():
    # Guardian bosses (7)
    write("bosses/guardian-reactor.svg", boss_reactor())
    write("bosses/guardian-nav.svg", boss_nav())
    write("bosses/guardian-life.svg", boss_life())
    write("bosses/guardian-comms.svg", boss_comms())
    write("bosses/guardian-thruster.svg", boss_thruster())
    write("bosses/guardian-shield.svg", boss_shield())
    write("bosses/guardian-flight.svg", boss_flight())
    # Major boss (2 phases)
    write("bosses/major-core-phase1.svg", major_boss_phase1())
    write("bosses/major-core-phase2.svg", major_boss_phase2())

    # Unique ship-component icons (7)
    write("components/reactor-core.svg", comp_reactor_core())
    write("components/nav-array.svg", comp_nav_array())
    write("components/life-support.svg", comp_life_support())
    write("components/comms-relay.svg", comp_comms_relay())
    write("components/thruster-assembly.svg", comp_thruster())
    write("components/shield-emitter.svg", comp_shield_emitter())
    write("components/flight-computer.svg", comp_flight_computer())

    make_future_assets_2()


# ---------------------------------------------------------------- NEW ENEMY ARCHETYPES (5)
# Same 300x360 aggressive red/orange-over-chassis language as the shipping enemies, so a future
# session can assign brains to these without reusing existing sprites.

def _enemy_defs(i):
    return (f'<defs>{GLOW.format(i=i)}'
            f'<linearGradient id="{i}-b" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0%" stop-color="{BLUE}"/><stop offset="100%" stop-color="{PURPLE}"/>'
            '</linearGradient></defs>')


def enemy_brute():
    """Armored Brute: heavy plated tank bot, slow but tough."""
    i = "en6"
    return svg_open(300, 360, _enemy_defs(i)) + f'''
  <rect x="86" y="54" width="128" height="70" rx="10" fill="url(#{i}-b)" stroke="{RED}" stroke-width="3"/>
  <rect x="104" y="72" width="92" height="34" rx="6" fill="{DARK}" stroke="{RED}" stroke-width="2"/>
  <rect x="112" y="80" width="76" height="18" rx="4" fill="{RED}" filter="url(#{i}-glow)" opacity="0.8">
    <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.9s" repeatCount="indefinite"/></rect>
  <!-- layered armor torso -->
  <rect x="64" y="128" width="172" height="120" rx="12" fill="url(#{i}-b)" stroke="{RED}" stroke-width="3"/>
  <rect x="76" y="140" width="148" height="18" rx="4" fill="{PURPLE}" stroke="{DARK}" stroke-width="1"/>
  <rect x="76" y="166" width="148" height="18" rx="4" fill="{PURPLE}" stroke="{DARK}" stroke-width="1"/>
  <path d="M90,200 l28,0 l-14,22 l-28,0 z" fill="{ORANGE}" opacity="0.6"/>
  <path d="M150,200 l28,0 l-14,22 l-28,0 z" fill="{ORANGE}" opacity="0.6"/>
  <!-- huge fists -->
  <rect x="30" y="170" width="44" height="44" rx="8" fill="{PURPLE}" stroke="{RED}" stroke-width="2"/>
  <rect x="226" y="170" width="44" height="44" rx="8" fill="{PURPLE}" stroke="{RED}" stroke-width="2"/>
  <rect x="96" y="250" width="44" height="66" rx="8" fill="url(#{i}-b)" stroke="{RED}" stroke-width="2"/>
  <rect x="160" y="250" width="44" height="66" rx="8" fill="url(#{i}-b)" stroke="{RED}" stroke-width="2"/>
  <rect x="88" y="312" width="60" height="20" rx="5" fill="{PURPLE}"/>
  <rect x="152" y="312" width="60" height="20" rx="5" fill="{PURPLE}"/>
</svg>'''


def enemy_splitter():
    """Splitter: blobby segmented bot that spawns minis when destroyed."""
    i = "en7"
    return svg_open(300, 300, _enemy_defs(i)) + f'''
  <circle cx="150" cy="150" r="78" fill="url(#{i}-b)" stroke="{RED}" stroke-width="3"/>
  <!-- split seams -->
  <line x1="150" y1="72" x2="150" y2="228" stroke="{DARK}" stroke-width="3" opacity="0.5"/>
  <line x1="72" y1="150" x2="228" y2="150" stroke="{DARK}" stroke-width="3" opacity="0.5"/>
  <circle cx="150" cy="150" r="78" fill="none" stroke="{ORANGE}" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.5"/>
  <!-- cluster eyes (one per future split) -->
  <circle cx="124" cy="128" r="10" fill="{DARK}" stroke="{RED}" stroke-width="2"/>
  <circle cx="124" cy="128" r="5" fill="{RED}" filter="url(#{i}-glow)"/>
  <circle cx="176" cy="128" r="10" fill="{DARK}" stroke="{RED}" stroke-width="2"/>
  <circle cx="176" cy="128" r="5" fill="{RED}" filter="url(#{i}-glow)"/>
  <circle cx="124" cy="176" r="10" fill="{DARK}" stroke="{RED}" stroke-width="2"/>
  <circle cx="124" cy="176" r="5" fill="{RED}" filter="url(#{i}-glow)"/>
  <circle cx="176" cy="176" r="10" fill="{DARK}" stroke="{RED}" stroke-width="2"/>
  <circle cx="176" cy="176" r="5" fill="{RED}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="0.7s" repeatCount="indefinite"/></circle>
</svg>'''


def enemy_medic():
    """Repair Drone: support bot that heals allies, green cross."""
    i = "en8"
    return svg_open(300, 300, _enemy_defs(i)) + f'''
  <rect x="60" y="64" width="180" height="8" rx="4" fill="{PURPLE}" opacity="0.7"/>
  <line x1="150" y1="72" x2="150" y2="104" stroke="{PURPLE}" stroke-width="4"/>
  <circle cx="150" cy="166" r="60" fill="url(#{i}-b)" stroke="{GREEN}" stroke-width="3"/>
  <rect x="104" y="150" width="92" height="24" rx="12" fill="{DARK}" stroke="{GREEN}" stroke-width="2"/>
  <circle cx="128" cy="162" r="7" fill="{GREEN}" filter="url(#{i}-glow)"/>
  <circle cx="172" cy="162" r="7" fill="{GREEN}" filter="url(#{i}-glow)"/>
  <!-- heal cross emitter -->
  <rect x="142" y="190" width="16" height="36" rx="3" fill="{GREEN}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite"/></rect>
  <rect x="132" y="200" width="36" height="16" rx="3" fill="{GREEN}" filter="url(#{i}-glow)"/>
</svg>'''


def enemy_turret():
    """Gun Turret: stationary ranged bot, big barrel."""
    i = "en9"
    return svg_open(300, 300, _enemy_defs(i)) + f'''
  <ellipse cx="150" cy="250" rx="80" ry="22" fill="{PURPLE}" opacity="0.5"/>
  <rect x="96" y="200" width="108" height="50" rx="8" fill="url(#{i}-b)" stroke="{RED}" stroke-width="3"/>
  <!-- rotating dome -->
  <path d="M100,200 A50,50 0 0 1 200,200 Z" fill="url(#{i}-b)" stroke="{RED}" stroke-width="3"/>
  <circle cx="150" cy="190" r="16" fill="{DARK}" stroke="{RED}" stroke-width="2"/>
  <circle cx="150" cy="190" r="8" fill="{RED}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite"/></circle>
  <!-- barrel -->
  <rect x="150" y="150" width="20" height="90" rx="4" fill="{PURPLE}" stroke="{RED}" stroke-width="2"
        transform="rotate(35 160 180)"/>
  <circle cx="196" cy="150" r="9" fill="{ORANGE}" filter="url(#{i}-glow)"/>
</svg>'''


def enemy_swarm():
    """Swarm Mite: tiny fast bot, meant to appear in groups."""
    i = "en10"
    return svg_open(300, 300, _enemy_defs(i)) + f'''
  <ellipse cx="150" cy="170" rx="54" ry="40" fill="url(#{i}-b)" stroke="{RED}" stroke-width="2"/>
  <!-- twitchy legs -->
  <line x1="104" y1="170" x2="72" y2="150" stroke="{PURPLE}" stroke-width="4" stroke-linecap="round"/>
  <line x1="104" y1="180" x2="72" y2="200" stroke="{PURPLE}" stroke-width="4" stroke-linecap="round"/>
  <line x1="196" y1="170" x2="228" y2="150" stroke="{PURPLE}" stroke-width="4" stroke-linecap="round"/>
  <line x1="196" y1="180" x2="228" y2="200" stroke="{PURPLE}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="134" cy="162" r="8" fill="{RED}" filter="url(#{i}-glow)"/>
  <circle cx="166" cy="162" r="8" fill="{RED}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.2;1" dur="0.4s" repeatCount="indefinite"/></circle>
  <path d="M138,188 l12,10 l12,-10" fill="none" stroke="{ORANGE}" stroke-width="2"/>
</svg>'''


# ---------------------------------------------------------------- ENDING / EARTH ASSETS

def ending_earth():
    """A neon Earth for the departure ending (256x256)."""
    i = "earth"
    return svg_open(256, 256, f'<defs>{GLOW.format(i=i)}'
        f'<radialGradient id="{i}-o" cx="38%" cy="34%" r="70%">'
        f'<stop offset="0%" stop-color="{BLUE}"/><stop offset="70%" stop-color="#2a6fb0"/>'
        f'<stop offset="100%" stop-color="#0a1a2e"/></radialGradient></defs>') + f'''
  <circle cx="128" cy="128" r="92" fill="url(#{i}-o)" stroke="{BLUE}" stroke-width="2" filter="url(#{i}-glow)"/>
  <!-- stylized continents in neon green -->
  <path d="M92,78 q24,-10 40,6 q10,14 -6,24 q-20,8 -34,-6 q-8,-14 0,-24 Z" fill="{GREEN}" opacity="0.65"/>
  <path d="M150,120 q22,2 30,22 q4,18 -16,26 q-22,4 -28,-14 q-2,-26 14,-34 Z" fill="{GREEN}" opacity="0.6"/>
  <path d="M78,150 q18,-4 24,12 q2,16 -16,18 q-16,-2 -16,-16 q0,-10 8,-14 Z" fill="{GREEN}" opacity="0.55"/>
  <!-- atmosphere rim -->
  <circle cx="128" cy="128" r="92" fill="none" stroke="{PINK}" stroke-width="1.5" opacity="0.4"/>
  <ellipse cx="100" cy="96" rx="34" ry="18" fill="#fff" opacity="0.12"/>
</svg>'''


def ending_starfield():
    """Tileable starfield backdrop (256x256), deep space with faint nebula."""
    i = "stars"
    import random as _r
    _r.seed(7)
    stars = ""
    for _ in range(80):
        x, y = _r.randint(0, 256), _r.randint(0, 256)
        r = _r.choice([0.6, 0.8, 1, 1, 1.4])
        c = _r.choice(["#ffffff", "#ffffff", BLUE, PINK])
        op = round(_r.uniform(0.3, 0.9), 2)
        stars += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" opacity="{op}"/>'
    return svg_open(256, 256) + f'''
  <rect width="256" height="256" fill="#060610"/>
  <ellipse cx="80" cy="90" rx="90" ry="54" fill="{PURPLE}" opacity="0.08"/>
  <ellipse cx="190" cy="180" rx="80" ry="50" fill="{BLUE}" opacity="0.06"/>
  {stars}
</svg>'''


def ending_ship():
    """The restored ship, departing (256x160). The thing you rebuild and fly home."""
    i = "ship"
    return svg_open(256, 160, f'<defs>{GLOW.format(i=i)}'
        f'<linearGradient id="{i}-b" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0%" stop-color="{BLUE}"/><stop offset="100%" stop-color="{PURPLE}"/>'
        '</linearGradient></defs>') + f'''
  <!-- hull -->
  <path d="M40,80 L150,56 Q210,64 230,80 Q210,96 150,104 L40,80 Z"
        fill="url(#{i}-b)" stroke="{BLUE}" stroke-width="2"/>
  <!-- cockpit -->
  <path d="M170,72 Q196,74 206,80 Q196,86 170,88 Z" fill="{DARK}" stroke="{PINK}" stroke-width="1.5"/>
  <circle cx="190" cy="80" r="4" fill="{PINK}" filter="url(#{i}-glow)"/>
  <!-- fins -->
  <path d="M70,80 L52,54 L92,72 Z" fill="{PURPLE}" stroke="{BLUE}" stroke-width="1"/>
  <path d="M70,80 L52,106 L92,88 Z" fill="{PURPLE}" stroke="{BLUE}" stroke-width="1"/>
  <!-- window row -->
  <circle cx="110" cy="80" r="3" fill="{GREEN}"/><circle cx="126" cy="80" r="3" fill="{GREEN}"/>
  <circle cx="142" cy="80" r="3" fill="{GREEN}"/>
  <!-- thruster flame trailing left -->
  <path d="M40,74 L8,80 L40,86 Z" fill="{ORANGE}" filter="url(#{i}-glow)" opacity="0.85">
    <animate attributeName="opacity" values="0.85;0.4;0.85" dur="0.4s" repeatCount="indefinite"/></path>
  <path d="M30,77 L2,80 L30,83 Z" fill="{PINK}" opacity="0.7"/>
</svg>'''


def ending_course_marker():
    """HUD 'course laid in: Earth' marker (64x64) for the departure sequence."""
    i = "crs"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <circle cx="32" cy="32" r="22" fill="none" stroke="{GREEN}" stroke-width="1.5" opacity="0.5"
          stroke-dasharray="4 4">
    <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32"
      dur="8s" repeatCount="indefinite"/></circle>
  <circle cx="32" cy="32" r="10" fill="#0a1a2e" stroke="{BLUE}" stroke-width="1.5"/>
  <circle cx="32" cy="32" r="5" fill="{GREEN}" opacity="0.7"/>
  <path d="M32,6 l4,8 l-8,0 z" fill="{PINK}" filter="url(#{i}-glow)"/>
</svg>'''


# ---------------------------------------------------------------- SECOND BIOME TILES (64x64)
# A visually distinct zone so the map can expand beyond the station interior. "hull" = exterior
# space-walk plating, "ice" = frozen derelict, "bio" = organic infestation.

def floor_hull():
    d = f'<rect width="64" height="64" fill="#0a0e18"/>'
    d += f'<rect x="2" y="2" width="60" height="60" fill="none" stroke="{BLUE}" stroke-width="1" opacity="0.2"/>'
    for gx in (16, 48):
        for gy in (16, 48):
            d += f'<circle cx="{gx}" cy="{gy}" r="2" fill="{BLUE}" opacity="0.3"/>'
    d += f'<line x1="0" y1="32" x2="64" y2="32" stroke="{PURPLE}" stroke-width="0.6" opacity="0.2"/>'
    d += f'<circle cx="46" cy="18" r="1" fill="#fff" opacity="0.5"/>'
    return svg_open(64, 64) + d + "</svg>"


def floor_ice():
    d = f'<rect width="64" height="64" fill="#0e1822"/>'
    d += f'<path d="M4,20 L24,12 L40,24 L60,16" fill="none" stroke="{BLUE}" stroke-width="0.8" opacity="0.4"/>'
    d += f'<path d="M6,44 L22,52 L44,42 L58,50" fill="none" stroke="{BLUE}" stroke-width="0.8" opacity="0.3"/>'
    d += f'<polygon points="30,28 36,34 30,40 24,34" fill="{BLUE}" opacity="0.18"/>'
    d += f'<circle cx="48" cy="48" r="1.5" fill="#cfe8ff" opacity="0.5"/>'
    return svg_open(64, 64) + d + "</svg>"


def floor_bio():
    d = f'<rect width="64" height="64" fill="#0d1710"/>'
    d += f'<path d="M8,56 Q18,30 10,10" fill="none" stroke="{GREEN}" stroke-width="1.5" opacity="0.35"/>'
    d += f'<path d="M34,58 Q40,34 30,14" fill="none" stroke="{GREEN}" stroke-width="1.5" opacity="0.3"/>'
    d += f'<path d="M54,56 Q60,36 50,18" fill="none" stroke="{GREEN}" stroke-width="1.5" opacity="0.3"/>'
    d += f'<circle cx="20" cy="22" r="2.5" fill="{GREEN}" opacity="0.4"/>'
    d += f'<circle cx="44" cy="40" r="2" fill="{PINK}" opacity="0.35"/>'
    return svg_open(64, 64) + d + "</svg>"


def wall_hull():
    return wall("#12161f", "#9ec5ff", "w5")


def wall_ice():
    return wall("#14202c", BLUE, "w6")


def wall_bio():
    return wall("#152218", GREEN, "w7")


# ---------------------------------------------------------------- PICKUPS / CONSUMABLES (64x64)

def pickup_credits():
    i = "pkc"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <circle cx="32" cy="32" r="18" fill="#2a2410" stroke="{ORANGE}" stroke-width="2"/>
  <circle cx="32" cy="32" r="13" fill="none" stroke="{ORANGE}" stroke-width="1" opacity="0.6"/>
  <path d="M28,24 l0,16 M26,27 q10,-4 10,3 q0,6 -8,4 q10,-1 10,5 q0,7 -12,3"
        fill="none" stroke="{ORANGE}" stroke-width="2" filter="url(#{i}-glow)"/>
</svg>'''


def pickup_repair():
    i = "pkr"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="16" y="16" width="32" height="32" rx="6" fill="#152418" stroke="{GREEN}" stroke-width="2"/>
  <rect x="29" y="22" width="6" height="20" rx="2" fill="{GREEN}" filter="url(#{i}-glow)"/>
  <rect x="22" y="29" width="20" height="6" rx="2" fill="{GREEN}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite"/></rect>
</svg>'''


def pickup_shield():
    i = "pks"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <path d="M32,12 C22,16 16,22 16,36 C16,48 32,54 32,54 C32,54 48,48 48,36 C48,22 42,16 32,12 Z"
        fill="#12202e" stroke="{BLUE}" stroke-width="2"/>
  <path d="M32,20 C26,23 22,27 22,36 C22,44 32,48 32,48 Z" fill="{BLUE}" filter="url(#{i}-glow)" opacity="0.6"/>
</svg>'''


def pickup_ammo():
    i = "pka"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="24" y="14" width="16" height="36" rx="4" fill="{DARK}" stroke="{PINK}" stroke-width="2"/>
  <rect x="27" y="18" width="10" height="26" rx="2" fill="{PINK}" filter="url(#{i}-glow)" opacity="0.7">
    <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1s" repeatCount="indefinite"/></rect>
  <rect x="28" y="10" width="8" height="5" fill="{PINK}"/>
</svg>'''


def pickup_mapfrag():
    i = "pkm"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <path d="M16,18 L48,14 L50,46 L18,50 Z" fill="#101019" stroke="{BLUE}" stroke-width="2"/>
  <line x1="24" y1="22" x2="24" y2="46" stroke="{BLUE}" stroke-width="0.8" opacity="0.4"/>
  <line x1="34" y1="20" x2="34" y2="48" stroke="{BLUE}" stroke-width="0.8" opacity="0.4"/>
  <path d="M20,40 L30,30 L38,36 L46,24" fill="none" stroke="{GREEN}" stroke-width="1.5" opacity="0.7"/>
  <circle cx="46" cy="24" r="3" fill="{PINK}" filter="url(#{i}-glow)"/>
</svg>'''


# ---------------------------------------------------------------- WEAPON / UPGRADE TIER ICONS (64x64)

def _weapon_icon(i, accent, pips):
    pip_svg = "".join(
        f'<circle cx="{20 + n*8}" cy="52" r="2.5" fill="{accent}" filter="url(#{i}-glow)"/>'
        for n in range(pips))
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="18" y="12" width="28" height="34" rx="5" fill="{DARK}" stroke="{accent}" stroke-width="2"/>
  <path d="M32,16 l7,13 l-5,0 l5,11 l-12,-14 l5,0 z" fill="{accent}" filter="url(#{i}-glow)"/>
  {pip_svg}
</svg>'''


def weapon_mk1():
    return _weapon_icon("wm1", BLUE, 1)


def weapon_mk2():
    return _weapon_icon("wm2", GREEN, 2)


def weapon_mk3():
    return _weapon_icon("wm3", PINK, 3)


def weapon_plasma_edge():
    i = "wpe"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="26" y="40" width="12" height="14" rx="2" fill="{PURPLE}" stroke="{PINK}" stroke-width="1.5"/>
  <path d="M30,40 L30,10 L34,6 L38,10 L34,40 Z" fill="{PINK}" filter="url(#{i}-glow)" opacity="0.9">
    <animate attributeName="opacity" values="0.9;0.5;0.9" dur="0.8s" repeatCount="indefinite"/></path>
  <line x1="32" y1="14" x2="32" y2="38" stroke="#fff" stroke-width="1" opacity="0.7"/>
</svg>'''


def weapon_capacitor_cannon():
    i = "wcc"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="12" y="28" width="26" height="14" rx="3" fill="{PURPLE}" stroke="{BLUE}" stroke-width="2"/>
  <rect x="36" y="30" width="18" height="10" rx="2" fill="{DARK}" stroke="{ORANGE}" stroke-width="1.5"/>
  <circle cx="52" cy="35" r="4" fill="{ORANGE}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite"/></circle>
  <rect x="16" y="20" width="6" height="10" rx="1" fill="{BLUE}"/>
  <circle cx="20" cy="35" r="3" fill="{GREEN}"/>
</svg>'''


# ---------------------------------------------------------------- STATUS / TELEGRAPH VFX (64x64)

def status_telegraph():
    i = "stg"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <circle cx="32" cy="32" r="24" fill="none" stroke="{RED}" stroke-width="3" opacity="0.8">
    <animate attributeName="r" values="10;26;10" dur="0.8s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.9;0.2;0.9" dur="0.8s" repeatCount="indefinite"/></circle>
  <path d="M32,20 l0,16 M32,42 l0,3" stroke="{RED}" stroke-width="4" stroke-linecap="round" filter="url(#{i}-glow)"/>
</svg>'''


def status_dash():
    i = "sds"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <path d="M14,32 l24,0 M30,22 l12,10 l-12,10" fill="none" stroke="{BLUE}" stroke-width="4"
        stroke-linecap="round" stroke-linejoin="round" filter="url(#{i}-glow)"/>
  <line x1="8" y1="24" x2="18" y2="24" stroke="{BLUE}" stroke-width="2" opacity="0.5"/>
  <line x1="8" y1="40" x2="18" y2="40" stroke="{BLUE}" stroke-width="2" opacity="0.5"/>
</svg>'''


def status_overclock():
    i = "soc"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <circle cx="32" cy="32" r="20" fill="none" stroke="{ORANGE}" stroke-width="2" opacity="0.5"/>
  <path d="M34,14 l-12,22 l8,0 l-4,16 l14,-24 l-9,0 z" fill="{ORANGE}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.4;1" dur="0.5s" repeatCount="indefinite"/></path>
</svg>'''


def status_shield_up():
    i = "ssu"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <circle cx="32" cy="32" r="22" fill="none" stroke="{BLUE}" stroke-width="2" stroke-dasharray="5 4" opacity="0.7">
    <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32"
      dur="6s" repeatCount="indefinite"/></circle>
  <path d="M32,16 C25,18 21,22 21,31 C21,40 32,45 32,45 C32,45 43,40 43,31 C43,22 39,18 32,16 Z"
        fill="{BLUE}" opacity="0.3" stroke="{BLUE}" stroke-width="1.5" filter="url(#{i}-glow)"/>
</svg>'''


def status_stun():
    i = "sst"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <path d="M20,22 q12,-8 24,0" fill="none" stroke="{ORANGE}" stroke-width="2"/>
  <circle cx="22" cy="28" r="3" fill="{ORANGE}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite"/></circle>
  <circle cx="42" cy="28" r="3" fill="{ORANGE}" filter="url(#{i}-glow)">
    <animate attributeName="opacity" values="0.3;1;0.3" dur="0.5s" repeatCount="indefinite"/></circle>
  <path d="M28,24 l8,8 M36,24 l-8,8" stroke="{PINK}" stroke-width="2" stroke-linecap="round"/>
</svg>'''


# ---------------------------------------------------------------- UI CHROME

def ui_logo():
    """Title-screen logo lockup (320x120)."""
    i = "logo"
    return svg_open(320, 120, f'<defs>{GLOW.format(i=i)}'
        f'<linearGradient id="{i}-g" x1="0" y1="0" x2="1" y2="0">'
        f'<stop offset="0%" stop-color="{BLUE}"/><stop offset="100%" stop-color="{PINK}"/>'
        '</linearGradient></defs>') + f'''
  <!-- little robot mascot -->
  <rect x="18" y="34" width="54" height="46" rx="8" fill="{PURPLE}" stroke="{BLUE}" stroke-width="2"/>
  <rect x="28" y="44" width="34" height="18" rx="4" fill="{DARK}"/>
  <circle cx="38" cy="53" r="4" fill="{PINK}" filter="url(#{i}-glow)"/>
  <circle cx="52" cy="53" r="4" fill="{BLUE}" filter="url(#{i}-glow)"/>
  <line x1="45" y1="34" x2="45" y2="24" stroke="{BLUE}" stroke-width="2"/>
  <circle cx="45" cy="21" r="4" fill="{GREEN}">
    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/></circle>
  <!-- wordmark -->
  <text x="92" y="66" font-family="'Space Grotesk', monospace" font-size="34" font-weight="700"
        fill="url(#{i}-g)" filter="url(#{i}-glow)">ROBOT-GAME</text>
  <text x="94" y="88" font-family="monospace" font-size="12" fill="{PINK}" opacity="0.8">RESTORE THE SHIP</text>
</svg>'''


def ui_panel_frame():
    """A neon panel/dialog frame (200x120), 9-slice-friendly corners."""
    i = "pnl"
    return svg_open(200, 120, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="4" y="4" width="192" height="112" rx="10" fill="{DARK}" fill-opacity="0.8" stroke="{PURPLE}" stroke-width="2"/>
  <rect x="4" y="4" width="192" height="112" rx="10" fill="none" stroke="{BLUE}" stroke-width="1" opacity="0.4"/>
  <!-- corner accents -->
  <path d="M4,20 L4,10 Q4,4 10,4 L20,4" fill="none" stroke="{PINK}" stroke-width="2"/>
  <path d="M180,4 L190,4 Q196,4 196,10 L196,20" fill="none" stroke="{PINK}" stroke-width="2"/>
  <path d="M4,100 L4,110 Q4,116 10,116 L20,116" fill="none" stroke="{PINK}" stroke-width="2"/>
  <path d="M180,116 L190,116 Q196,116 196,110 L196,100" fill="none" stroke="{PINK}" stroke-width="2"/>
</svg>'''


def _marker(i, color, inner):
    return svg_open(32, 32, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <circle cx="16" cy="16" r="12" fill="#0d0d1a" stroke="{color}" stroke-width="2"/>
  {inner}
</svg>'''


def ui_marker_boss():
    return _marker("mkb", RED, f'<path d="M16,9 l4,6 l-4,6 l-4,-6 z" fill="{RED}" filter="url(#mkb-glow)"/>'
                   f'<circle cx="16" cy="16" r="2" fill="#fff"/>')


def ui_marker_key():
    return _marker("mkk", ORANGE, f'<rect x="11" y="12" width="8" height="6" rx="1" fill="{ORANGE}"/>'
                   f'<rect x="18" y="13" width="4" height="2" fill="{ORANGE}"/>')


def ui_marker_unexplored():
    return _marker("mku", "#6b7488", f'<text x="16" y="21" text-anchor="middle" '
                   f'font-family="monospace" font-size="14" fill="#6b7488">?</text>')


def ui_cursor():
    i = "cur"
    return svg_open(32, 32, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <path d="M4,4 L20,12 L13,14 L18,24 L14,26 L9,16 L4,20 Z" fill="{PINK}" stroke="#fff"
        stroke-width="1" filter="url(#{i}-glow)"/>
</svg>'''


def ui_selection():
    i = "sel"
    return svg_open(64, 64, f'<defs>{GLOW.format(i=i)}</defs>') + f'''
  <rect x="4" y="4" width="56" height="56" rx="6" fill="none" stroke="{GREEN}" stroke-width="2"
        stroke-dasharray="8 6" filter="url(#{i}-glow)">
    <animate attributeName="stroke-dashoffset" values="0;14" dur="0.6s" repeatCount="indefinite"/></rect>
  <path d="M4,16 L4,8 Q4,4 8,4 L16,4" fill="none" stroke="{GREEN}" stroke-width="3"/>
  <path d="M48,4 L56,4 Q60,4 60,8 L60,16" fill="none" stroke="{GREEN}" stroke-width="3"/>
</svg>'''


def make_future_assets_2():
    # New enemy archetypes (5)
    write("enemies/brute.svg", enemy_brute())
    write("enemies/splitter.svg", enemy_splitter())
    write("enemies/medic.svg", enemy_medic())
    write("enemies/turret.svg", enemy_turret())
    write("enemies/swarm.svg", enemy_swarm())

    # Ending / Earth assets
    write("ending/earth.svg", ending_earth())
    write("ending/starfield.svg", ending_starfield())
    write("ending/ship.svg", ending_ship())
    write("ending/course-marker.svg", ending_course_marker())

    # Second biome tiles
    write("tiles2/floor-hull.svg", floor_hull())
    write("tiles2/floor-ice.svg", floor_ice())
    write("tiles2/floor-bio.svg", floor_bio())
    write("tiles2/wall-hull.svg", wall_hull())
    write("tiles2/wall-ice.svg", wall_ice())
    write("tiles2/wall-bio.svg", wall_bio())

    # Pickups / consumables
    write("pickups/credits.svg", pickup_credits())
    write("pickups/repair.svg", pickup_repair())
    write("pickups/shield.svg", pickup_shield())
    write("pickups/ammo.svg", pickup_ammo())
    write("pickups/map-fragment.svg", pickup_mapfrag())

    # Weapon / upgrade tier icons
    write("weapons/mk1.svg", weapon_mk1())
    write("weapons/mk2.svg", weapon_mk2())
    write("weapons/mk3.svg", weapon_mk3())
    write("weapons/plasma-edge.svg", weapon_plasma_edge())
    write("weapons/capacitor-cannon.svg", weapon_capacitor_cannon())

    # Status / telegraph VFX
    write("status/telegraph.svg", status_telegraph())
    write("status/dash.svg", status_dash())
    write("status/overclock.svg", status_overclock())
    write("status/shield-up.svg", status_shield_up())
    write("status/stun.svg", status_stun())

    # UI chrome
    write("ui/logo.svg", ui_logo())
    write("ui/panel-frame.svg", ui_panel_frame())
    write("ui/marker-boss.svg", ui_marker_boss())
    write("ui/marker-key.svg", ui_marker_key())
    write("ui/marker-unexplored.svg", ui_marker_unexplored())
    write("ui/cursor.svg", ui_cursor())
    write("ui/selection.svg", ui_selection())


if __name__ == "__main__":
    main()
