# Handwriting Analysis Report
## Reference Image: handwritting6.jpg

---

## Image Information
- **Dimensions**: 1237 × 1600 pixels
- **Detected Components**: 24742
- **Detected Lines**: 30
- **Text Regions**: 11

---

## 1. Character Dimensions
| Metric | Value |
|--------|-------|
| Average Character Height | 24.9 px |
| Average Character Width | 24.3 px |
| Average Aspect Ratio (W/H) | 1.004 |
| Std Dev Height | 7.7 px |
| Std Dev Width | 14.6 px |
| Coefficient of Variation (Height) | 0.309 |
| Coefficient of Variation (Width) | 0.600 |

**Interpretation**: Characters are wide.
Height variation is high (CV = 0.31).

---

## 2. Line Spacing
| Metric | Value |
|--------|-------|
| Average Line Spacing | 114.1 px |
| Std Dev Line Spacing | 80.5 px |
| Coefficient of Variation | 0.706 |

**Interpretation**: Line spacing is highly variable.

---

## 3. Writing Slant
| Metric | Value |
|--------|-------|
| Average Slant | 6.0° |
| Std Dev Slant | 52.1° |
| Coefficient of Variation | 8.665 |

**Interpretation**: Writing has a **rightward** slant of 6.0°.
Slant consistency is low.

---

## 4. Baseline Variation
| Metric | Value |
|--------|-------|
| Average Baseline Deviation | 8.4 px |
| Std Dev Baseline Deviation | 9.5 px |
| Baseline Quality Score | 0.095 |

**Interpretation**: Baseline is wavy.

---

## 5. Stroke Thickness
| Metric | Value |
|--------|-------|
| Average Stroke Thickness | 2.14 px |
| Std Dev Stroke Thickness | 0.55 px |

**Interpretation**: Stroke is **medium** with variable pressure.

---

## 6. Ink Density
- **Ink Density**: 0.1530 (ratio of ink pixels in text regions)

**Interpretation**: Heavy ink coverage.

---

## 7. Margins (pixels)
| Margin | Value |
|--------|-------|
| Left | 579.5 px |
| Right | 616.1 px |
| Top | 49.0 px |
| Bottom | 46.0 px |

---

## 8. Connectedness
- **Connectedness Ratio**: 0.899

**Interpretation**: Writing is **highly connected (cursive)**.

---

## 9. Writing Irregularity (Natural Variation)
| Metric | Value | Interpretation |
|--------|-------|----------------|
| CV Character Height | 0.309 | Variable |
| CV Character Width | 0.600 | Variable |
| CV Line Spacing | 0.706 | Variable |
| CV Slant | 8.665 | Variable |

---

## Summary for Handwriting Generation Engine

### Key Parameters to Implement:
1. **Character Height**: 24.9px (base), CV=0.309
2. **Character Width**: 24.3px (base), CV=0.600
3. **Line Spacing**: 114.1px, CV=0.706
4. **Slant**: 6.0°, CV=8.665
5. **Baseline Variation**: σ=9.5px
6. **Stroke Thickness**: 2.14px, σ=0.55px
7. **Connectedness**: 0.899 (affects letter spacing)
8. **Margins**: L=579, R=616, T=49, B=46

### Recommended Engine Settings:
```json
{
  "baseFontSize": 19,
  "lineHeight": 125,
  "letterSpacing": 2.4323795180722896,
  "wordSpacing": 12.161897590361447,
  "slantDegrees": 6.0,
  "baselineVariationPx": 9.5,
  "strokeThickness": 2.14,
  "connectednessFactor": 0.899,
  "heightVariationCV": 0.309,
  "widthVariationCV": 0.600,
  "slantVariationCV": 8.665
}
```
