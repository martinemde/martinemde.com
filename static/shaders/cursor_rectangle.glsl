// Cursor rectangle shader
// Draws a simple rectangle at the cursor position with the cursor color

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Get the background color from the previous shader pass
    vec4 bgColor = texture(iChannel0, fragCoord / iResolution.xy);

    // Get cursor position and size
    vec2 cursorPos = iCurrentCursor.xy;
    vec2 cursorSize = iCurrentCursor.zw;

    // Calculate distance to cursor rectangle edges
    vec2 toCenter = fragCoord - cursorPos;
    vec2 halfSize = cursorSize * 0.5;

    // Check if we're inside the cursor rectangle
    bool insideCursor = abs(toCenter.x) < halfSize.x && abs(toCenter.y) < halfSize.y;

    // Border width (2 pixels)
    float borderWidth = 2.0;
    vec2 innerHalfSize = halfSize - vec2(borderWidth);
    bool insideInner = abs(toCenter.x) < innerHalfSize.x && abs(toCenter.y) < innerHalfSize.y;

    // Draw border only
    if (insideCursor && !insideInner) {
        // Render cursor border with the cursor color
        fragColor = iCurrentCursorColor;
    } else {
        // Pass through background
        fragColor = bgColor;
    }
}
