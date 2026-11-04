#!/usr/bin/env python3
"""
make_pptx.py — Generate the team presentation as a valid .pptx (Office Open XML)
WITHOUT any third-party libraries (python-pptx is not available in this environment).

A .pptx is a ZIP (OPC package) of XML parts. This script writes the minimal but
spec-valid set of parts PowerPoint / Keynote / LibreOffice / Google Slides accept:
  [Content_Types].xml, _rels/.rels, presentation.xml (+rels), presProps, theme,
  slideMaster (+rels), slideLayout (+rels), and one slide per content page.

Run:  python3 docs/make_pptx.py
Out:  docs/INSE6110-Secure-Messaging.pptx
"""
import os, zipfile

EMU = 914400  # English Metric Units per inch
W = int(13.333 * EMU)  # 16:9 slide width
H = int(7.5 * EMU)

# ---- Colors (hex, no #) ----
NAVY = "0F172A"
BLUE = "1D4ED8"
SLATE = "475569"
GREEN = "15803D"
RED = "B91C1C"
AMBER = "B45309"
LIGHT = "F1F5F9"
WHITE = "FFFFFF"


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;"))


def run(text, sz, color=NAVY, bold=False, italic=False):
    """A single text run (<a:r>)."""
    b = ' b="1"' if bold else ""
    i = ' i="1"' if italic else ""
    return (f'<a:r><a:rPr lang="en-US" sz="{sz}"{b}{i} dirty="0">'
            f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
            f'<a:latin typeface="Segoe UI"/></a:rPr>'
            f'<a:t>{esc(text)}</a:t></a:r>')


def para(runs, bullet=False, lvl=0, align="l", space_after=400):
    """A paragraph (<a:p>) made of runs. runs = list of <a:r> strings."""
    bu = '' if bullet else '<a:buNone/>'
    marL = f' marL="{228600*(lvl+1)}" indent="-228600"' if bullet else ''
    algn = f' algn="{align}"' if align != "l" else ''
    pr = f'<a:pPr{marL}{algn} lvl="{lvl}"><a:spcAft><a:spcPts val="{space_after}"/></a:spcAft>{bu}</a:pPr>'
    return f'<a:p>{pr}{"".join(runs)}</a:p>'


def textbox(sp_id, name, x, y, cx, cy, paras, fill=None, line=None):
    """A text box shape with optional background fill and border."""
    fill_xml = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
    line_xml = (f'<a:ln w="12700"><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln>'
                if line else '')
    body = "".join(paras)
    return f'''<p:sp>
<p:nvSpPr><p:cNvPr id="{sp_id}" name="{name}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
<a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>{fill_xml}{line_xml}</p:spPr>
<p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t"><a:normAutofit/></a:bodyPr><a:lstStyle/>{body}</p:txBody>
</p:sp>'''


def slide_xml(shapes):
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
{"".join(shapes)}
</p:spTree></p:cSld><p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr>
</p:sld>'''


# ---------------------------------------------------------------- slide builders
def bg():
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="2" name="bg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
            f'<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{W}" cy="{H}"/></a:xfrm>'
            f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
            f'<a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill></p:spPr>'
            f'<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>')


def accent_bar():
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="3" name="bar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
            f'<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{W}" cy="{int(0.18*EMU)}"/></a:xfrm>'
            f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
            f'<a:solidFill><a:srgbClr val="{BLUE}"/></a:solidFill></p:spPr>'
            f'<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>')


def in_(v):
    return int(v * EMU)


def title_slide():
    shapes = [bg(), accent_bar()]
    shapes.append(textbox(10, "title", in_(0.9), in_(2.2), in_(11.5), in_(1.6), [
        para([run("Secure Messaging System", 4000, NAVY, bold=True)]),
    ]))
    shapes.append(textbox(11, "sub", in_(0.9), in_(3.7), in_(11.5), in_(1.0), [
        para([run("End-to-End Encrypted Messaging — a working prototype", 2000, SLATE)]),
    ]))
    shapes.append(textbox(12, "course", in_(0.9), in_(4.6), in_(11.5), in_(1.6), [
        para([run("INSE 6110 — Foundations of Cryptography", 1600, BLUE, bold=True)]),
        para([run("X25519  •  HKDF-SHA-256  •  Ed25519  •  AES-256-GCM", 1400, SLATE)]),
    ]))
    shapes.append(textbox(13, "team", in_(0.9), in_(6.3), in_(11.5), in_(0.8), [
        para([run("Team: Aniket • Deepanshu • Pallavi Joshi • Yusra Saba • Hari Krishna Rathnakumar   |   Instructor: Dr. Ayda Basyouni", 1100, SLATE)]),
    ]))
    return shapes


def content_slide(number, title, bullets, note=None):
    """bullets: list of (text, level, color, bold)."""
    shapes = [bg(), accent_bar()]
    shapes.append(textbox(10, "title", in_(0.7), in_(0.45), in_(12), in_(1.0), [
        para([run(title, 2800, NAVY, bold=True)]),
    ]))
    bps = []
    for item in bullets:
        text, lvl, color, bold = item
        bps.append(para([run(text, 1700 if lvl == 0 else 1500, color, bold=bold)],
                        bullet=True, lvl=lvl, space_after=500))
    shapes.append(textbox(11, "body", in_(0.9), in_(1.7), in_(11.6), in_(5.0), bps))
    if note:
        shapes.append(textbox(12, "note", in_(0.9), in_(6.7), in_(11.6), in_(0.6), [
            para([run(note, 1200, SLATE, italic=True)]),
        ]))
    shapes.append(textbox(13, "pageno", in_(12.4), in_(6.9), in_(0.8), in_(0.4), [
        para([run(str(number), 1100, SLATE)], align="r")]))
    return shapes


def two_col_slide(number, title, left_title, left_items, left_color,
                  right_title, right_items, right_color, note=None):
    shapes = [bg(), accent_bar()]
    shapes.append(textbox(10, "title", in_(0.7), in_(0.45), in_(12), in_(1.0), [
        para([run(title, 2800, NAVY, bold=True)])]))
    # left card
    lp = [para([run(left_title, 1900, left_color, bold=True)], space_after=500)]
    for t in left_items:
        lp.append(para([run(t, 1400, NAVY)], bullet=True, space_after=400))
    shapes.append(textbox(11, "left", in_(0.7), in_(1.8), in_(5.9), in_(4.6), lp,
                          fill=WHITE, line=left_color))
    # right card
    rp = [para([run(right_title, 1900, right_color, bold=True)], space_after=500)]
    for t in right_items:
        rp.append(para([run(t, 1400, NAVY)], bullet=True, space_after=400))
    shapes.append(textbox(12, "right", in_(6.75), in_(1.8), in_(5.9), in_(4.6), rp,
                          fill=WHITE, line=right_color))
    if note:
        shapes.append(textbox(13, "note", in_(0.7), in_(6.6), in_(12), in_(0.7), [
            para([run(note, 1300, SLATE, italic=True)])]))
    shapes.append(textbox(14, "pageno", in_(12.4), in_(6.9), in_(0.8), in_(0.4), [
        para([run(str(number), 1100, SLATE)], align="r")]))
    return shapes


# ---------------------------------------------------------------- deck content
def build_slides():
    slides = []
    slides.append(title_slide())

    slides.append(content_slide(2, "The Problem", [
        ("Encryption hides message contents — but it does NOT confirm WHO is on the other end.", 0, NAVY, True),
        ("If an attacker replaces the public key-exchange data, they can set up separate keys with each user.", 0, NAVY, False),
        ("The attacker then sits in the middle and reads everything — a Man-in-the-Middle (MITM) attack.", 0, RED, True),
        ("Our project shows this risk with a working prototype, and shows how authentication prevents it.", 0, GREEN, False),
    ], note="Goal: connect cryptographic theory to a practical, demoable application."))

    slides.append(content_slide(3, "What We Built", [
        ("A browser-based, end-to-end-encrypted messaging demo.", 0, NAVY, True),
        ("All cryptography runs client-side in the browser — the server/wire only ever sees ciphertext.", 0, NAVY, False),
        ("Three interactive demo modes: normal messaging, tamper detection, and MITM (authenticated vs unauthenticated).", 0, BLUE, False),
        ("A live performance panel measuring key-establishment and encrypt/decrypt latency.", 0, NAVY, False),
        ("Zero install: runs from a static file server; verified end-to-end.", 0, SLATE, False),
    ], note="Educational prototype — not production software."))

    slides.append(content_slide(4, "Cryptographic Building Blocks", [
        ("X25519 (RFC 7748) — elliptic-curve Diffie-Hellman key agreement.", 0, NAVY, True),
        ("HKDF-SHA-256 (RFC 5869) — derives the 256-bit session key from the shared secret.", 0, NAVY, True),
        ("Ed25519 (RFC 8032) — signs the handshake transcript to authenticate identities.", 0, NAVY, True),
        ("AES-256-GCM (NIST SP 800-38D) — authenticated encryption; the tag guarantees integrity.", 0, NAVY, True),
        ("Implemented with the Web Crypto API + a vendored @noble/ed25519 library.", 0, SLATE, False),
    ], note="Standard, well-reviewed primitives — we combine them, we do not invent new ones."))

    slides.append(content_slide(5, "How the Handshake Works", [
        ("0 — Identity: each party has a long-term Ed25519 key; fingerprints compared out-of-band.", 0, NAVY, False),
        ("1 — Exchange: both generate ephemeral X25519 key pairs and swap public keys.", 0, NAVY, False),
        ("2 — Authenticate: each signs the transcript with Ed25519 and verifies the other's signature.", 0, BLUE, True),
        ("3 — Derive: X25519 shared secret → HKDF-SHA-256 → identical 256-bit AES-GCM key.", 0, NAVY, False),
        ("4 — Message: AES-256-GCM with a fresh 96-bit nonce per message; tag enforces integrity.", 0, GREEN, True),
    ], note="See flow-diagram.svg for the full sequence diagram."))

    slides.append(content_slide(6, "Message Integrity (Tamper Detection)", [
        ("Every message is sealed with AES-256-GCM, which produces a 128-bit authentication tag.", 0, NAVY, False),
        ("Any change to the ciphertext, nonce, or associated data makes the tag check fail.", 0, NAVY, True),
        ("Decryption then throws — the recipient rejects the message instead of showing garbage.", 0, RED, True),
        ("Demo: tick 'Tamper with next ciphertext' and watch the recipient reject the altered message.", 0, SLATE, False),
    ], note="Confidentiality AND integrity come from the same authenticated-encryption step."))

    slides.append(two_col_slide(7, "Why Authentication Matters: MITM",
        "Unauthenticated exchange", [
            "Mallory swaps the X25519 ephemeral keys.",
            "No signatures, so nobody notices.",
            "She establishes two sessions: Alice↔Mallory and Mallory↔Bob.",
            "She decrypts, reads, and re-encrypts every message.",
            "Attack SUCCEEDS — undetected.",
        ], RED,
        "Authenticated exchange (Ed25519)", [
            "Ephemeral keys are bound to identity keys via signatures.",
            "Mallory cannot forge a victim's Ed25519 signature.",
            "The transcript signature check fails on swapped keys.",
            "The handshake is rejected.",
            "Attack DETECTED — the fix works.",
        ], GREEN,
        note="This comparison is the core experimental result of the project."))

    slides.append(content_slide(8, "Architecture at a Glance", [
        ("Client (browser): key generation, handshake, encrypt/decrypt — all private keys stay here.", 0, NAVY, True),
        ("Wire / server: relays and stores only ciphertext, IVs, public keys and signatures.", 0, NAVY, False),
        ("Never leaves the client: plaintext messages and private keys.", 0, RED, True),
        ("UI panes: Alice  |  The Wire (ciphertext view)  |  Bob, with live handshake log.", 0, SLATE, False),
        ("The proposal targets Next.js + Supabase; this demo uses the identical crypto design, standalone.", 0, SLATE, False),
    ], note="Matches the proposal's design: the database stores no plaintext and no private keys."))

    slides.append(content_slide(9, "Performance & Evaluation", [
        ("Measured in-browser with the Performance API.", 0, NAVY, False),
        ("Synthetic payloads: 64 B, 256 B, 1 KB, 4 KB, averaged over repeated trials.", 0, NAVY, False),
        ("Metrics: key-establishment time, encrypt/decrypt latency, and ciphertext overhead (iv + tag).", 0, BLUE, True),
        ("Security outcomes: tamper detection rate and MITM success/detection by mode.", 0, NAVY, False),
        ("Headless test suite: 11/11 checks pass (primitives + all attack scenarios).", 0, GREEN, True),
    ], note="Reproducible numbers via the 'Run Benchmark' button in the app."))

    slides.append(content_slide(10, "Live Demo Script", [
        ("1. Baseline — authenticated, no attacker: establish channel, exchange messages.", 0, NAVY, False),
        ("2. Tamper detection — flip a ciphertext byte, show the recipient reject it.", 0, NAVY, False),
        ("3. MITM on unauthenticated — Mallory reads and relays every message.", 0, RED, False),
        ("4. MITM on authenticated — handshake rejected; attack defeated.", 0, GREEN, False),
        ("5. Run the benchmark and read off the metrics.", 0, NAVY, False),
    ], note="Run:  cd secure-messaging && python3 -m http.server 8000  →  open http://localhost:8000/"))

    slides.append(content_slide(11, "Scope, Limitations & Next Steps", [
        ("Educational prototype — not a production messenger.", 0, NAVY, True),
        ("Out of scope (for now): full Signal Double Ratchet, multi-device, key recovery.", 0, SLATE, False),
        ("Security depends on correct identity verification, private-key protection, nonce uniqueness.", 0, NAVY, False),
        ("Next steps: wire up Supabase storage/real-time, add the Double Ratchet, persistent sessions.", 0, BLUE, False),
    ], note="Honest about what the prototype does and does not guarantee."))

    slides.append(content_slide(12, "Summary", [
        ("We combined key agreement, key derivation, signatures, and authenticated encryption into a working app.", 0, NAVY, True),
        ("The demo makes an abstract attack concrete: unauthenticated exchange is broken by MITM; authentication fixes it.", 0, NAVY, False),
        ("Integrity is enforced end-to-end by AES-GCM tags.", 0, GREEN, True),
        ("Everything is reproducible: run the app, run the tests, read the flow diagram.", 0, SLATE, False),
    ], note="Questions? See README.md and docs/flow-diagram.svg."))

    return slides


# ---------------------------------------------------------------- OOXML package
def content_types(n):
    overrides = "".join(
        f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for i in range(1, n + 1))
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
{overrides}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''


ROOT_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''


def presentation_xml(n):
    sldids = "".join(f'<p:sldId id="{256+i}" r:id="rId{i+2}"/>' for i in range(n))
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>{sldids}</p:sldIdLst>
<p:sldSz cx="{W}" cy="{H}" type="screen16x9"/>
<p:notesSz cx="{H}" cy="{W}"/>
</p:presentation>'''


def presentation_rels(n):
    rels = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>']
    for i in range(n):
        rels.append(f'<Relationship Id="rId{i+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i+1}.xml"/>')
    rels.append(f'<Relationship Id="rId{n+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>')
    rels.append(f'<Relationship Id="rId{n+3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>')
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + "".join(rels) + '</Relationships>'


PRESPROPS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>'

SLIDE_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>'

MASTER_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>'

LAYOUT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>'

SLIDE_MASTER = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles>
<p:titleStyle><a:lvl1pPr><a:defRPr sz="4000"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Segoe UI"/></a:defRPr></a:lvl1pPr></p:titleStyle>
<p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Segoe UI"/></a:defRPr></a:lvl1pPr></p:bodyStyle>
<p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle>
</p:txStyles>
</p:sldMaster>'''

SLIDE_LAYOUT = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld>
<p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr>
</p:sldLayout>'''

THEME = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
<a:themeElements>
<a:clrScheme name="Office">
<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="0F172A"/></a:dk2>
<a:lt2><a:srgbClr val="F1F5F9"/></a:lt2>
<a:accent1><a:srgbClr val="1D4ED8"/></a:accent1>
<a:accent2><a:srgbClr val="15803D"/></a:accent2>
<a:accent3><a:srgbClr val="B91C1C"/></a:accent3>
<a:accent4><a:srgbClr val="B45309"/></a:accent4>
<a:accent5><a:srgbClr val="7C3AED"/></a:accent5>
<a:accent6><a:srgbClr val="0EA5E9"/></a:accent6>
<a:hlink><a:srgbClr val="1D4ED8"/></a:hlink>
<a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Office">
<a:majorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="Office">
<a:fillStyleLst>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
</a:fillStyleLst>
<a:lnStyleLst>
<a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
<a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
</a:lnStyleLst>
<a:effectStyleLst>
<a:effectStyle><a:effectLst/></a:effectStyle>
<a:effectStyle><a:effectLst/></a:effectStyle>
<a:effectStyle><a:effectLst/></a:effectStyle>
</a:effectStyleLst>
<a:bgFillStyleLst>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
</a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>'''

CORE = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>Secure Messaging System — INSE 6110</dc:title>
<dc:creator>INSE 6110 Team</dc:creator>
<cp:keywords>cryptography, X25519, Ed25519, AES-GCM, HKDF, MITM</cp:keywords>
</cp:coreProperties>'''


def app_props(n):
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>INSE6110-generator</Application>
<Slides>{n}</Slides>
<Company>Concordia University</Company>
</Properties>'''


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "INSE6110-Secure-Messaging.pptx")
    slides = build_slides()
    n = len(slides)

    parts = {
        "[Content_Types].xml": content_types(n),
        "_rels/.rels": ROOT_RELS,
        "ppt/presentation.xml": presentation_xml(n),
        "ppt/_rels/presentation.xml.rels": presentation_rels(n),
        "ppt/presProps.xml": PRESPROPS,
        "ppt/theme/theme1.xml": THEME,
        "ppt/slideMasters/slideMaster1.xml": SLIDE_MASTER,
        "ppt/slideMasters/_rels/slideMaster1.xml.rels": MASTER_RELS,
        "ppt/slideLayouts/slideLayout1.xml": SLIDE_LAYOUT,
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels": LAYOUT_RELS,
        "docProps/core.xml": CORE,
        "docProps/app.xml": app_props(n),
    }
    for i, shapes in enumerate(slides, start=1):
        parts[f"ppt/slides/slide{i}.xml"] = slide_xml(shapes)
        parts[f"ppt/slides/_rels/slide{i}.xml.rels"] = SLIDE_RELS

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        # [Content_Types].xml should be first; store it without compression overhead issues
        z.writestr("[Content_Types].xml", parts.pop("[Content_Types].xml"))
        for name, data in parts.items():
            z.writestr(name, data)

    print(f"Wrote {out} ({n} slides, {os.path.getsize(out)} bytes)")
    return out


if __name__ == "__main__":
    main()
