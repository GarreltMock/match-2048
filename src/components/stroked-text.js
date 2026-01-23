/**
 * StrokedText Web Component
 * Displays text with a customizable stroke outline using SVG
 *
 * Attributes:
 * - text: The text to display
 * - font-size: Font size (default: 32)
 * - fill: Fill color (default: #fff)
 * - stroke: Stroke color (default: #000)
 * - stroke-width: Stroke width (default: 6)
 * - width: SVG viewBox width (optional, auto-calculated based on text length if not provided)
 * - height: SVG viewBox height (optional, auto-calculated as fontSize * 1.35 if not provided)
 * - font-weight: Font weight (default: 900)
 * - text-anchor: Text anchor position (default: middle)
 * - svg-style: Additional styles for the SVG element (optional)
 */
class StrokedText extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ["text", "font-size", "fill", "stroke", "stroke-width", "width", "height", "font-weight", "text-anchor"];
    }

    attributeChangedCallback() {
        if (this.shadowRoot.children.length > 0) {
            this.render();
        }
    }

    // Check if text contains emoji characters
    containsEmoji(text) {
        const emojiRegex =
            /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/u;
        return emojiRegex.test(text);
    }

    render() {
        const text = this.getAttribute("text") || "";
        const fontSize = Number(this.getAttribute("font-size") || "32");
        const fill = this.getAttribute("fill") || "#fff";
        const stroke = this.getAttribute("stroke") || "#000";
        const strokeWidth = Number(this.getAttribute("stroke-width") || "6");
        const fontWeight = this.getAttribute("font-weight") || "900";
        const textAnchor = this.getAttribute("text-anchor") || "middle";
        const svgStyle = this.getAttribute("svg-style") || "";

        // Check if text contains emojis - use canvas-based approach for emojis
        const hasEmoji = this.containsEmoji(text);

        // Calculate dimensions if not provided
        // Height is based on font size + stroke padding
        const height = Number(this.getAttribute("height")) || fontSize * 1.35;

        // Width estimation: ~0.6 * fontSize per character on average for Nunito
        // Add padding for stroke width on both sides
        const estimatedTextWidth = text.length * fontSize * 0.6;
        const padding = strokeWidth * 2;
        const width = Number(this.getAttribute("width")) || estimatedTextWidth + padding;

        // Calculate center position based on text anchor
        const x = textAnchor === "middle" ? width / 2 : textAnchor === "end" ? width - strokeWidth : 0;
        const y = height * 0.75; // Position text vertically centered

        // For emojis, render to canvas first to get proper pixel data
        if (hasEmoji) {
            this.renderEmojiWithCanvas(text, fontSize, stroke, strokeWidth, width, height, svgStyle);
            return;
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                }
                svg {
                    display: block;
                    font-family: "Nunito", system-ui, -apple-system, sans-serif;
                    ${svgStyle}
                }
            </style>
            <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
                <text
                    x="${x}"
                    y="${y}"
                    font-size="${fontSize}"
                    font-weight="${fontWeight}"
                    fill="${fill}"
                    stroke="${stroke}"
                    stroke-width="${strokeWidth}"
                    paint-order="stroke fill"
                    stroke-linejoin="round"
                    text-anchor="${textAnchor}"
                >
                    ${text}
                </text>
            </svg>
        `;
    }

    renderEmojiWithCanvas(text, fontSize, stroke, strokeWidth, width, height, svgStyle) {
        // Use higher resolution for crisp rendering
        const scale = 4;
        const scaledFontSize = fontSize * scale;
        const scaledStrokeWidth = strokeWidth * scale;

        // Minimal padding just for the stroke
        const padding = scaledStrokeWidth;
        const canvasSize = scaledFontSize + padding * 2;

        // Vertical offset to center emoji better (emojis often sit high)
        const verticalOffset = scaledFontSize * 0.15;

        // Create offscreen canvas to draw emoji
        const emojiCanvas = document.createElement("canvas");
        emojiCanvas.width = canvasSize;
        emojiCanvas.height = canvasSize;
        const emojiCtx = emojiCanvas.getContext("2d");

        // Draw emoji centered
        emojiCtx.font = `${scaledFontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        emojiCtx.textAlign = "center";
        emojiCtx.textBaseline = "middle";
        emojiCtx.fillText(text, canvasSize / 2, canvasSize / 2 + verticalOffset);

        // Create the final canvas with stroke
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = canvasSize;
        finalCanvas.height = canvasSize;
        const finalCtx = finalCanvas.getContext("2d");

        // Draw the stroke by drawing the emoji multiple times offset in all directions
        finalCtx.font = `${scaledFontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        finalCtx.textAlign = "center";
        finalCtx.textBaseline = "middle";

        // Parse stroke color first
        const tempDiv = document.createElement("div");
        tempDiv.style.color = stroke;
        document.body.appendChild(tempDiv);
        const computedColor = getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);
        const rgbMatch = computedColor.match(/(\d+)/g);
        const strokeR = parseInt(rgbMatch[0]);
        const strokeG = parseInt(rgbMatch[1]);
        const strokeB = parseInt(rgbMatch[2]);

        // Create stroke effect by drawing in a circle pattern at multiple radii for smoothness
        const strokeRadius = scaledStrokeWidth / 2;
        const steps = 32; // More steps for smoother circle
        const radiusSteps = 3; // Draw at multiple radii for filled stroke

        for (let r = 1; r <= radiusSteps; r++) {
            const currentRadius = (strokeRadius * r) / radiusSteps;
            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const offsetX = Math.cos(angle) * currentRadius;
                const offsetY = Math.sin(angle) * currentRadius;

                finalCtx.save();
                finalCtx.translate(offsetX, offsetY);
                finalCtx.fillText(text, canvasSize / 2, canvasSize / 2 + verticalOffset);
                finalCtx.restore();
            }
        }

        // Convert to stroke color - preserve alpha for anti-aliasing
        const imageData = finalCtx.getImageData(0, 0, canvasSize, canvasSize);
        const data = imageData.data;

        // Replace colors but preserve alpha for smooth edges
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                data[i] = strokeR;
                data[i + 1] = strokeG;
                data[i + 2] = strokeB;
                // Keep original alpha for anti-aliasing
            }
        }
        finalCtx.putImageData(imageData, 0, 0);

        // Draw the original emoji on top
        finalCtx.drawImage(emojiCanvas, 0, 0);

        // Get the final image as a data URL
        const finalDataUrl = finalCanvas.toDataURL("image/png");

        // Display size matches the canvas proportions
        const imageSize = fontSize + strokeWidth;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: ${width}px;
                    height: ${height}px;
                }
                img {
                    display: block;
                    width: ${imageSize}px;
                    height: ${imageSize}px;
                    ${svgStyle}
                }
            </style>
            <img src="${finalDataUrl}" alt="${text}" />
        `;
    }
}

customElements.define("stroked-text", StrokedText);
