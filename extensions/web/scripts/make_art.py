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

    print("done")


if __name__ == "__main__":
    main()
