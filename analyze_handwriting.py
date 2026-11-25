#!/usr/bin/env python3
"""
Handwriting Analysis Script for Reference Image
Analyzes handwritting6.jpg to extract 16+ handwriting characteristics
for improving the handwriting generation engine.
"""

import cv2
import numpy as np
import matplotlib.pyplot as plt
import json
import os
from pathlib import Path

# Configuration
IMAGE_PATH = r"C:\Users\Lenovo\Desktop\handwritting6.jpg"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "handwriting_analysis")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def load_and_preprocess(image_path):
    """Load image and convert to grayscale with preprocessing."""
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not load image: {image_path}")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Enhance contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    return img, gray, enhanced

def binarize_image(gray):
    """Convert to binary using adaptive thresholding."""
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 11, 2
    )
    return binary

def detect_lines(binary):
    """Detect horizontal lines (baselines) using Hough transform."""
    # Horizontal kernel for line detection
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel)

    # Find contours of lines
    contours, _ = cv2.findContours(horizontal_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    lines = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 100:  # Filter out noise
            lines.append({'y': y, 'height': h, 'x': x, 'width': w})

    lines.sort(key=lambda x: x['y'])
    return lines, horizontal_lines

def detect_text_regions(binary, lines):
    """Detect text regions between lines."""
    regions = []
    for i in range(len(lines) - 1):
        y1 = lines[i]['y'] + lines[i]['height']
        y2 = lines[i + 1]['y']
        if y2 - y1 > 10:  # Minimum line spacing
            regions.append({'top': y1, 'bottom': y2, 'height': y2 - y1})
    return regions

def analyze_characteristics(img, gray, binary, lines, regions):
    """Extract all handwriting characteristics."""

    # 1. Line Spacing
    line_spacings = []
    for i in range(len(lines) - 1):
        spacing = lines[i + 1]['y'] - (lines[i]['y'] + lines[i]['height'])
        if spacing > 0:
            line_spacings.append(spacing)
    avg_line_spacing = np.mean(line_spacings) if line_spacings else 0
    std_line_spacing = np.std(line_spacings) if line_spacings else 0

    # 2. Character/Word Analysis using connected components
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)

    char_heights = []
    char_widths = []
    char_areas = []
    char_aspect_ratios = []

    for i in range(1, num_labels):  # Skip background (0)
        area = stats[i, cv2.CC_STAT_AREA]
        w = stats[i, cv2.CC_STAT_WIDTH]
        h = stats[i, cv2.CC_STAT_HEIGHT]

        # Filter reasonable character sizes
        if 20 < area < 5000 and 5 < w < 100 and 10 < h < 80:
            char_heights.append(h)
            char_widths.append(w)
            char_areas.append(area)
            char_aspect_ratios.append(w / h if h > 0 else 0)

    avg_char_height = np.mean(char_heights) if char_heights else 0
    avg_char_width = np.mean(char_widths) if char_widths else 0
    avg_aspect_ratio = np.mean(char_aspect_ratios) if char_aspect_ratios else 0
    std_char_height = np.std(char_heights) if char_heights else 0
    std_char_width = np.std(char_widths) if char_widths else 0

    # 3. Word Spacing - analyze horizontal gaps between components in same line
    word_spacings = []
    for region in regions:
        # Get components in this line region
        line_mask = (labels >= region['top']) & (labels <= region['bottom'])
        # This is simplified - in practice, project to 1D and find gaps
        pass

    # Better approach: Project to horizontal axis and find gaps
    # For each line region, project and find gaps
    horizontal_projections = []
    for region in regions:
        roi = binary[region['top']:region['bottom'], :]
        projection = np.sum(roi > 0, axis=0)
        horizontal_projections.append(projection)

    # 4. Writing Slant - analyze character orientation
    # Use moments or Hough lines on individual characters
    slants = []
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if 50 < area < 2000:
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]

            # Extract character ROI
            char_roi = binary[y:y+h, x:x+w]
            if char_roi.size > 0:
                # Find orientation using moments
                moments = cv2.moments(char_roi)
                if moments['mu20'] + moments['mu02'] > 0:
                    angle = 0.5 * np.arctan2(2 * moments['mu11'], moments['mu20'] - moments['mu02'])
                    slants.append(np.degrees(angle))

    avg_slant = np.mean(slants) if slants else 0
    std_slant = np.std(slants) if slants else 0

    # 5. Baseline Variation - analyze how characters align to baselines
    baseline_deviations = []
    for i, line in enumerate(lines):
        line_y = line['y'] + line['height']
        # Find characters near this baseline
        for j in range(1, num_labels):
            cy = stats[j, cv2.CC_STAT_TOP] + stats[j, cv2.CC_STAT_HEIGHT]
            if abs(cy - line_y) < 20:  # Near baseline
                baseline_deviations.append(cy - line_y)

    avg_baseline_dev = np.mean(np.abs(baseline_deviations)) if baseline_deviations else 0
    std_baseline_dev = np.std(baseline_deviations) if baseline_deviations else 0

    # 6. Stroke Thickness - estimate using distance transform
    dist_transform = cv2.distanceTransform(binary, cv2.DIST_L2, 3)
    stroke_thicknesses = dist_transform[binary > 0]
    avg_stroke_thickness = np.mean(stroke_thicknesses) * 2 if len(stroke_thicknesses) > 0 else 0
    std_stroke_thickness = np.std(stroke_thicknesses) * 2 if len(stroke_thicknesses) > 0 else 0

    # 7. Ink Density - ratio of ink pixels to total in text regions
    total_text_pixels = np.sum(binary > 0)
    total_region_area = sum(r['height'] * gray.shape[1] for r in regions)
    ink_density = total_text_pixels / total_region_area if total_region_area > 0 else 0

    # 8. Margins
    # Left margin - minimum x of components
    left_margins = [stats[i, cv2.CC_STAT_LEFT] for i in range(1, num_labels)
                    if stats[i, cv2.CC_STAT_AREA] > 50]
    avg_left_margin = np.mean(left_margins) if left_margins else 0

    # Right margin
    right_edges = [stats[i, cv2.CC_STAT_LEFT] + stats[i, cv2.CC_STAT_WIDTH]
                   for i in range(1, num_labels) if stats[i, cv2.CC_STAT_AREA] > 50]
    avg_right_margin = gray.shape[1] - np.mean(right_edges) if right_edges else 0

    # Top margin - first line position
    top_margin = lines[0]['y'] if lines else 0

    # Bottom margin
    bottom_margin = gray.shape[0] - (lines[-1]['y'] + lines[-1]['height']) if lines else 0

    # 9. Connectedness - analyze if characters touch
    # Dilate slightly and see how many components merge
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    dilated = cv2.dilate(binary, kernel, iterations=1)
    num_labels_dilated, _, _, _ = cv2.connectedComponentsWithStats(dilated, connectivity=8)
    connectedness_ratio = 1 - (num_labels_dilated / num_labels) if num_labels > 1 else 0

    # 10. Character Shape Analysis - using Hu moments
    hu_moments_list = []
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if 50 < area < 2000:
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            char_roi = binary[y:y+h, x:x+w]
            if char_roi.size > 0:
                moments = cv2.moments(char_roi)
                hu = cv2.HuMoments(moments).flatten()
                hu_moments_list.append(hu)

    # 11. Writing Irregularities - coefficient of variation for various metrics
    cv_char_height = std_char_height / avg_char_height if avg_char_height > 0 else 0
    cv_char_width = std_char_width / avg_char_width if avg_char_width > 0 else 0
    cv_line_spacing = std_line_spacing / avg_line_spacing if avg_line_spacing > 0 else 0
    cv_slant = std_slant / abs(avg_slant) if abs(avg_slant) > 0.1 else 0

    # Compile results
    results = {
        'image_info': {
            'width': gray.shape[1],
            'height': gray.shape[0],
            'num_detected_components': num_labels - 1,
            'num_lines': len(lines),
            'num_text_regions': len(regions)
        },
        'character_dimensions': {
            'avg_char_height_px': float(avg_char_height),
            'avg_char_width_px': float(avg_char_width),
            'avg_aspect_ratio': float(avg_aspect_ratio),
            'std_char_height_px': float(std_char_height),
            'std_char_width_px': float(std_char_width),
            'cv_char_height': float(cv_char_height),
            'cv_char_width': float(cv_char_width)
        },
        'spacing': {
            'avg_line_spacing_px': float(avg_line_spacing),
            'std_line_spacing_px': float(std_line_spacing),
            'cv_line_spacing': float(cv_line_spacing),
            'avg_word_spacing_px': 0.0,  # Need better word detection
        },
        'slant': {
            'avg_slant_degrees': float(avg_slant),
            'std_slant_degrees': float(std_slant),
            'cv_slant': float(cv_slant)
        },
        'baseline': {
            'avg_deviation_px': float(avg_baseline_dev),
            'std_deviation_px': float(std_baseline_dev),
            'baseline_quality': float(1.0 / (1.0 + std_baseline_dev)) if std_baseline_dev > 0 else 1.0
        },
        'stroke': {
            'avg_thickness_px': float(avg_stroke_thickness),
            'std_thickness_px': float(std_stroke_thickness),
        },
        'ink_density': float(ink_density),
        'margins': {
            'left_px': float(avg_left_margin),
            'right_px': float(avg_right_margin),
            'top_px': float(top_margin),
            'bottom_px': float(bottom_margin)
        },
        'connectedness': float(connectedness_ratio),
        'irregularity': {
            'cv_char_height': float(cv_char_height),
            'cv_char_width': float(cv_char_width),
            'cv_line_spacing': float(cv_line_spacing),
            'cv_slant': float(cv_slant)
        }
    }

    return results, labels, stats, centroids, horizontal_projections

def visualize_analysis(img, gray, binary, lines, regions, labels, stats, output_dir):
    """Create visualization of the analysis."""
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))

    # Original
    axes[0, 0].imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    axes[0, 0].set_title('Original Image')
    axes[0, 0].axis('off')

    # Grayscale
    axes[0, 1].imshow(gray, cmap='gray')
    axes[0, 1].set_title('Grayscale')
    axes[0, 1].axis('off')

    # Binary
    axes[0, 2].imshow(binary, cmap='gray')
    axes[0, 2].set_title('Binary (Inverted)')
    axes[0, 2].axis('off')

    # Detected lines
    line_img = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    for line in lines:
        cv2.line(line_img, (0, line['y']), (gray.shape[1], line['y']), (0, 255, 0), 2)
        cv2.line(line_img, (0, line['y'] + line['height']), (gray.shape[1], line['y'] + line['height']), (255, 0, 0), 1)
    axes[1, 0].imshow(line_img)
    axes[1, 0].set_title('Detected Baselines (Green) & Line Tops (Blue)')
    axes[1, 0].axis('off')

    # Connected components (sample)
    comp_img = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    for i in range(1, min(len(stats), 100)):
        x, y, w, h, area = stats[i]
        if 20 < area < 5000:
            cv2.rectangle(comp_img, (x, y), (x+w, y+h), (0, 255, 0), 1)
    axes[1, 1].imshow(comp_img)
    axes[1, 1].set_title('Detected Components (Sample)')
    axes[1, 1].axis('off')

    # Horizontal projection for first region
    if regions:
        roi = binary[regions[0]['top']:regions[0]['bottom'], :]
        projection = np.sum(roi > 0, axis=0)
        axes[1, 2].plot(projection)
        axes[1, 2].set_title('Horizontal Projection (Line 1)')
        axes[1, 2].set_xlabel('X Position')
        axes[1, 2].set_ylabel('Ink Pixel Count')

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'handwriting_analysis_visualization.png'), dpi=150, bbox_inches='tight')
    plt.close()

def generate_report(results, output_path):
    """Generate detailed analysis report in Markdown."""
    r = results

    report = f"""# Handwriting Analysis Report
## Reference Image: handwritting6.jpg

---

## Image Information
- **Dimensions**: {r['image_info']['width']} × {r['image_info']['height']} pixels
- **Detected Components**: {r['image_info']['num_detected_components']}
- **Detected Lines**: {r['image_info']['num_lines']}
- **Text Regions**: {r['image_info']['num_text_regions']}

---

## 1. Character Dimensions
| Metric | Value |
|--------|-------|
| Average Character Height | {r['character_dimensions']['avg_char_height_px']:.1f} px |
| Average Character Width | {r['character_dimensions']['avg_char_width_px']:.1f} px |
| Average Aspect Ratio (W/H) | {r['character_dimensions']['avg_aspect_ratio']:.3f} |
| Std Dev Height | {r['character_dimensions']['std_char_height_px']:.1f} px |
| Std Dev Width | {r['character_dimensions']['std_char_width_px']:.1f} px |
| Coefficient of Variation (Height) | {r['character_dimensions']['cv_char_height']:.3f} |
| Coefficient of Variation (Width) | {r['character_dimensions']['cv_char_width']:.3f} |

**Interpretation**: Characters are {'tall and narrow' if r['character_dimensions']['avg_aspect_ratio'] < 0.7 else 'wide' if r['character_dimensions']['avg_aspect_ratio'] > 1.0 else 'balanced'}.
Height variation is {'low' if r['character_dimensions']['cv_char_height'] < 0.15 else 'moderate' if r['character_dimensions']['cv_char_height'] < 0.3 else 'high'} (CV = {r['character_dimensions']['cv_char_height']:.2f}).

---

## 2. Line Spacing
| Metric | Value |
|--------|-------|
| Average Line Spacing | {r['spacing']['avg_line_spacing_px']:.1f} px |
| Std Dev Line Spacing | {r['spacing']['std_line_spacing_px']:.1f} px |
| Coefficient of Variation | {r['spacing']['cv_line_spacing']:.3f} |

**Interpretation**: Line spacing is {'consistent' if r['spacing']['cv_line_spacing'] < 0.1 else 'moderately variable' if r['spacing']['cv_line_spacing'] < 0.25 else 'highly variable'}.

---

## 3. Writing Slant
| Metric | Value |
|--------|-------|
| Average Slant | {r['slant']['avg_slant_degrees']:.1f}° |
| Std Dev Slant | {r['slant']['std_slant_degrees']:.1f}° |
| Coefficient of Variation | {r['slant']['cv_slant']:.3f} |

**Interpretation**: Writing has a **{'rightward' if r['slant']['avg_slant_degrees'] > 2 else 'leftward' if r['slant']['avg_slant_degrees'] < -2 else 'vertical'}** slant of {abs(r['slant']['avg_slant_degrees']):.1f}°.
Slant consistency is {'high' if r['slant']['cv_slant'] < 0.3 else 'moderate' if r['slant']['cv_slant'] < 0.6 else 'low'}.

---

## 4. Baseline Variation
| Metric | Value |
|--------|-------|
| Average Baseline Deviation | {r['baseline']['avg_deviation_px']:.1f} px |
| Std Dev Baseline Deviation | {r['baseline']['std_deviation_px']:.1f} px |
| Baseline Quality Score | {r['baseline']['baseline_quality']:.3f} |

**Interpretation**: Baseline is {'very straight' if r['baseline']['std_deviation_px'] < 2 else 'straight' if r['baseline']['std_deviation_px'] < 5 else 'wavy'}.

---

## 5. Stroke Thickness
| Metric | Value |
|--------|-------|
| Average Stroke Thickness | {r['stroke']['avg_thickness_px']:.2f} px |
| Std Dev Stroke Thickness | {r['stroke']['std_thickness_px']:.2f} px |

**Interpretation**: Stroke is **{'thin' if r['stroke']['avg_thickness_px'] < 1.5 else 'medium' if r['stroke']['avg_thickness_px'] < 2.5 else 'thick'}** with {'consistent' if r['stroke']['std_thickness_px'] < 0.5 else 'variable'} pressure.

---

## 6. Ink Density
- **Ink Density**: {r['ink_density']:.4f} (ratio of ink pixels in text regions)

**Interpretation**: {'Light' if r['ink_density'] < 0.05 else 'Medium' if r['ink_density'] < 0.15 else 'Heavy'} ink coverage.

---

## 7. Margins (pixels)
| Margin | Value |
|--------|-------|
| Left | {r['margins']['left_px']:.1f} px |
| Right | {r['margins']['right_px']:.1f} px |
| Top | {r['margins']['top_px']:.1f} px |
| Bottom | {r['margins']['bottom_px']:.1f} px |

---

## 8. Connectedness
- **Connectedness Ratio**: {r['connectedness']:.3f}

**Interpretation**: Writing is **{'highly connected (cursive)' if r['connectedness'] > 0.5 else 'moderately connected' if r['connectedness'] > 0.2 else 'mostly disconnected (print)'}**.

---

## 9. Writing Irregularity (Natural Variation)
| Metric | Value | Interpretation |
|--------|-------|----------------|
| CV Character Height | {r['irregularity']['cv_char_height']:.3f} | {'Natural' if r['irregularity']['cv_char_height'] < 0.2 else 'Variable'} |
| CV Character Width | {r['irregularity']['cv_char_width']:.3f} | {'Natural' if r['irregularity']['cv_char_width'] < 0.2 else 'Variable'} |
| CV Line Spacing | {r['irregularity']['cv_line_spacing']:.3f} | {'Natural' if r['irregularity']['cv_line_spacing'] < 0.15 else 'Variable'} |
| CV Slant | {r['irregularity']['cv_slant']:.3f} | {'Natural' if r['irregularity']['cv_slant'] < 0.4 else 'Variable'} |

---

## Summary for Handwriting Generation Engine

### Key Parameters to Implement:
1. **Character Height**: {r['character_dimensions']['avg_char_height_px']:.1f}px (base), CV={r['character_dimensions']['cv_char_height']:.3f}
2. **Character Width**: {r['character_dimensions']['avg_char_width_px']:.1f}px (base), CV={r['character_dimensions']['cv_char_width']:.3f}
3. **Line Spacing**: {r['spacing']['avg_line_spacing_px']:.1f}px, CV={r['spacing']['cv_line_spacing']:.3f}
4. **Slant**: {r['slant']['avg_slant_degrees']:.1f}°, CV={r['slant']['cv_slant']:.3f}
5. **Baseline Variation**: σ={r['baseline']['std_deviation_px']:.1f}px
6. **Stroke Thickness**: {r['stroke']['avg_thickness_px']:.2f}px, σ={r['stroke']['std_thickness_px']:.2f}px
7. **Connectedness**: {r['connectedness']:.3f} (affects letter spacing)
8. **Margins**: L={r['margins']['left_px']:.0f}, R={r['margins']['right_px']:.0f}, T={r['margins']['top_px']:.0f}, B={r['margins']['bottom_px']:.0f}

### Recommended Engine Settings:
```json
{{
  "baseFontSize": {max(12, int(r['character_dimensions']['avg_char_height_px'] * 0.8))},
  "lineHeight": {max(20, int(r['spacing']['avg_line_spacing_px'] * 1.1))},
  "letterSpacing": {max(0.2, r['character_dimensions']['avg_char_width_px'] * 0.1)},
  "wordSpacing": {max(2, r['character_dimensions']['avg_char_width_px'] * 0.5)},
  "slantDegrees": {r['slant']['avg_slant_degrees']:.1f},
  "baselineVariationPx": {r['baseline']['std_deviation_px']:.1f},
  "strokeThickness": {r['stroke']['avg_thickness_px']:.2f},
  "connectednessFactor": {r['connectedness']:.3f},
  "heightVariationCV": {r['character_dimensions']['cv_char_height']:.3f},
  "widthVariationCV": {r['character_dimensions']['cv_char_width']:.3f},
  "slantVariationCV": {r['slant']['cv_slant']:.3f}
}}
```
"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)

    return report

def save_json_results(results, output_path):
    """Save results as JSON for programmatic use."""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)

def main():
    print("=" * 60)
    print("HANDWRITING ANALYSIS - handwritting6.jpg")
    print("=" * 60)

    # Load and preprocess
    print("\n1. Loading and preprocessing image...")
    img, gray, enhanced = load_and_preprocess(IMAGE_PATH)
    print(f"   Image size: {gray.shape[1]}x{gray.shape[0]}")

    # Binarize
    print("\n2. Binarizing image...")
    binary = binarize_image(enhanced)

    # Detect lines
    print("\n3. Detecting baselines...")
    lines, horizontal_lines = detect_lines(binary)
    print(f"   Detected {len(lines)} lines")

    # Detect text regions
    print("\n4. Detecting text regions...")
    regions = detect_text_regions(binary, lines)
    print(f"   Detected {len(regions)} text regions")

    # Analyze characteristics
    print("\n5. Analyzing handwriting characteristics...")
    results, labels, stats, centroids, h_projections = analyze_characteristics(
        img, gray, binary, lines, regions
    )

    # Visualize
    print("\n6. Creating visualizations...")
    visualize_analysis(img, gray, binary, lines, regions, labels, stats, OUTPUT_DIR)

    # Generate report
    print("\n7. Generating report...")
    report_path = os.path.join(OUTPUT_DIR, 'handwriting_analysis_report.md')
    report = generate_report(results, report_path)

    # Save JSON
    json_path = os.path.join(OUTPUT_DIR, 'handwriting_analysis_results.json')
    save_json_results(results, json_path)

    print("\n" + "=" * 60)
    print("ANALYSIS COMPLETE")
    print("=" * 60)
    print(f"Report: {report_path}")
    print(f"JSON: {json_path}")
    print(f"Visualization: {os.path.join(OUTPUT_DIR, 'handwriting_analysis_visualization.png')}")

    # Print summary
    print("\n--- KEY FINDINGS ---")
    r = results
    print(f"Character Height: {r['character_dimensions']['avg_char_height_px']:.1f}px (CV: {r['character_dimensions']['cv_char_height']:.3f})")
    print(f"Character Width:  {r['character_dimensions']['avg_char_width_px']:.1f}px (CV: {r['character_dimensions']['cv_char_width']:.3f})")
    print(f"Line Spacing:     {r['spacing']['avg_line_spacing_px']:.1f}px (CV: {r['spacing']['cv_line_spacing']:.3f})")
    print(f"Slant:            {r['slant']['avg_slant_degrees']:.1f} deg (CV: {r['slant']['cv_slant']:.3f})")
    print(f"Baseline sigma:   {r['baseline']['std_deviation_px']:.1f}px")
    print(f"Stroke Thickness: {r['stroke']['avg_thickness_px']:.2f}px")
    print(f"Connectedness:    {r['connectedness']:.3f}")
    print(f"Margins (L/R/T/B): {r['margins']['left_px']:.0f}/{r['margins']['right_px']:.0f}/{r['margins']['top_px']:.0f}/{r['margins']['bottom_px']:.0f}px")

if __name__ == "__main__":
    main()