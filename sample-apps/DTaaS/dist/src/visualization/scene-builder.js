// src/visualization/scene-builder.ts
export function buildDevicePartGroup(shape, mappings, propertyValues) {
    let code = `const deviceGroup = new THREE.Group();\nconst meshes = {};\n\n`;
    for (const part of shape.parts) {
        const role = part.role;
        const geom = part.geometry;
        const dims = part.dimensions;
        const pos = part.position;
        const rot = part.rotation;
        const colorHex = part.color;
        // Check if opacity is mapped to this role
        const isOpacityMapped = mappings.some(m => m.targetRole === role && m.property === "opacity");
        // Determine geometry constructor
        let geomConstructor = "";
        if (geom === "cylinder") {
            geomConstructor = `new THREE.CylinderGeometry(${dims[0] !== undefined ? dims[0] : 1}, ${dims[1] !== undefined ? dims[1] : 1}, ${dims[2] !== undefined ? dims[2] : 1}, ${dims[3] !== undefined ? dims[3] : 32})`;
        }
        else if (geom === "box") {
            geomConstructor = `new THREE.BoxGeometry(${dims[0] !== undefined ? dims[0] : 1}, ${dims[1] !== undefined ? dims[1] : 1}, ${dims[2] !== undefined ? dims[2] : 1})`;
        }
        else if (geom === "sphere") {
            geomConstructor = `new THREE.SphereGeometry(${dims[0] !== undefined ? dims[0] : 1}, ${dims[1] !== undefined ? dims[1] : 32}, ${dims[2] !== undefined ? dims[2] : 32})`;
        }
        else if (geom === "cone") {
            geomConstructor = `new THREE.ConeGeometry(${dims[0] !== undefined ? dims[0] : 1}, ${dims[1] !== undefined ? dims[1] : 1}, ${dims[2] !== undefined ? dims[2] : 32})`;
        }
        else if (geom === "torus") {
            geomConstructor = `new THREE.TorusGeometry(${dims[0] !== undefined ? dims[0] : 1}, ${dims[1] !== undefined ? dims[1] : 0.4}, ${dims[2] !== undefined ? dims[2] : 16}, ${dims[3] !== undefined ? dims[3] : 48})`;
        }
        // Apply dynamic initial values if available
        const currentVals = propertyValues[role] || {};
        const activeColor = currentVals.color !== undefined ? currentVals.color : colorHex;
        const activeScaleY = currentVals.scaleY !== undefined ? currentVals.scaleY : 1;
        const activeOpacity = currentVals.opacity !== undefined ? currentVals.opacity : 1;
        const isTransparent = isOpacityMapped || currentVals.opacity !== undefined;
        code += `// Part: ${role} (${geom})\n`;
        code += `const geom_${role} = ${geomConstructor};\n`;
        code += `const mat_${role} = new THREE.MeshStandardMaterial({\n`;
        code += `  color: "${activeColor}",\n`;
        code += `  metalness: 0.5,\n`;
        code += `  roughness: 0.4,\n`;
        code += `  transparent: ${isTransparent},\n`;
        code += `  opacity: ${activeOpacity}\n`;
        code += `});\n`;
        code += `const mesh_${role} = new THREE.Mesh(geom_${role}, mat_${role});\n`;
        code += `mesh_${role}.position.set(${pos[0]}, ${pos[1]}, ${pos[2]});\n`;
        if (rot) {
            code += `mesh_${role}.rotation.set(${rot[0]}, ${rot[1]}, ${rot[2]});\n`;
        }
        code += `mesh_${role}.scale.set(1, ${activeScaleY}, 1);\n`;
        code += `mesh_${role}.castShadow = true;\n`;
        code += `mesh_${role}.receiveShadow = true;\n`;
        code += `deviceGroup.add(mesh_${role});\n`;
        code += `meshes["${role}"] = mesh_${role};\n\n`;
    }
    // Embed current property values
    code += `const propertyValues = ${JSON.stringify(propertyValues)};\n\n`;
    // Write update function
    code += `function updateDeviceParts() {\n`;
    for (const part of shape.parts) {
        const role = part.role;
        // 1. rotationSpeed
        const hasRotation = mappings.some(m => m.targetRole === role && m.property === "rotationSpeed");
        if (hasRotation) {
            code += `  if (propertyValues["${role}"] && typeof propertyValues["${role}"].rotationSpeed === "number") {\n`;
            code += `    meshes["${role}"].rotation.y += propertyValues["${role}"].rotationSpeed / 60;\n`;
            code += `  }\n`;
        }
        // 2. color
        const hasColor = mappings.some(m => m.targetRole === role && m.property === "color");
        if (hasColor) {
            code += `  if (propertyValues["${role}"] && propertyValues["${role}"].color) {\n`;
            code += `    meshes["${role}"].material.color.set(propertyValues["${role}"].color);\n`;
            code += `  }\n`;
        }
        // 3. scaleY
        const hasScaleY = mappings.some(m => m.targetRole === role && m.property === "scaleY");
        if (hasScaleY) {
            code += `  if (propertyValues["${role}"] && typeof propertyValues["${role}"].scaleY === "number") {\n`;
            code += `    meshes["${role}"].scale.y = propertyValues["${role}"].scaleY;\n`;
            code += `  }\n`;
        }
        // 4. opacity
        const hasOpacity = mappings.some(m => m.targetRole === role && m.property === "opacity");
        if (hasOpacity) {
            code += `  if (propertyValues["${role}"] && typeof propertyValues["${role}"].opacity === "number") {\n`;
            code += `    meshes["${role}"].material.opacity = propertyValues["${role}"].opacity;\n`;
            code += `    meshes["${role}"].material.transparent = true;\n`;
            code += `  }\n`;
        }
    }
    code += `}\n`;
    return code;
}
export function buildDeviceScene(shape, mappings, propertyValues, latestReadings) {
    const hasRealData = latestReadings && Object.keys(latestReadings).length > 0;
    let metricRowsHtml = "";
    for (const map of mappings) {
        const metric = map.metric;
        const role = map.targetRole;
        const prop = map.property;
        let valStr = "NONE";
        if (hasRealData && latestReadings[metric] !== undefined) {
            const val = latestReadings[metric];
            let unit = "";
            const lowerMetric = metric.toLowerCase();
            if (lowerMetric.includes("temp"))
                unit = " °C";
            else if (lowerMetric.includes("rpm"))
                unit = " RPM";
            else if (lowerMetric.includes("pressure")) {
                unit = val > 50 ? " hPa" : " bar";
            }
            else if (lowerMetric.includes("flow"))
                unit = " GPM";
            else if (lowerMetric.includes("vibration"))
                unit = " mm/s";
            else if (lowerMetric.includes("efficiency") || lowerMetric.includes("humid") || lowerMetric.includes("batter") || lowerMetric.includes("level") || lowerMetric.includes("charge")) {
                unit = " %";
            }
            else if (lowerMetric.includes("volt"))
                unit = " V";
            else if (lowerMetric.includes("curr"))
                unit = " A";
            else if (lowerMetric.includes("power") || lowerMetric.includes("watt"))
                unit = " W";
            valStr = val.toFixed(1) + unit;
        }
        metricRowsHtml += `
      <div class="metric-row">
        <span class="metric-label">${metric} (${role}):</span>
        <span class="metric-value">${valStr}</span>
      </div>`;
    }
    if (!hasRealData) {
        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>3D Twin View - ${shape.deviceType}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%);
      color: #fff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #info-panel {
      background: rgba(18, 22, 33, 0.9);
      padding: 25px;
      border-radius: 12px;
      border: 1px solid rgba(239, 68, 68, 0.3);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(10px);
      width: 340px;
      text-align: center;
    }
    #info-panel h3 {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: 700;
      color: #f87171;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .metric-section {
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .metric-row {
      font-size: 13px;
      margin-bottom: 8px;
      color: #a0aec0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-label {
      font-weight: 500;
    }
    .metric-value {
      color: #f87171;
      font-weight: bold;
      font-family: 'Courier New', monospace;
    }
    #status-badge {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      background: rgba(248, 113, 113, 0.15);
      color: #f87171;
      border: 1px solid #f87171;
    }
    #no-data-msg {
      margin-top: 14px;
      font-size: 12px;
      color: #a0aec0;
    }
  </style>
</head>
<body>
  <div id="info-panel">
    <h3>⚠️ NO DATA</h3>
    <div class="metric-section">
      ${metricRowsHtml}
    </div>
    <div id="status-badge">OFFLINE</div>
    <div id="no-data-msg">No telemetry readings found for this device in the database.</div>
  </div>
</body>
</html>`;
    }
    const partGroupCode = buildDevicePartGroup(shape, mappings, propertyValues);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>3D Twin View - ${shape.deviceType}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%);
      color: #fff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    #canvas-container {
      width: 100%;
      height: 100%;
    }
    #info-panel {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(18, 22, 33, 0.9);
      padding: 20px;
      border-radius: 10px;
      border: 1px solid rgba(74, 144, 217, 0.3);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      pointer-events: none;
      user-select: none;
      width: 320px;
      z-index: 10;
    }
    #info-panel h3 {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 600;
      color: #4a90d9;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .metric-section {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .metric-section:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .metric-row {
      font-size: 13px;
      margin-bottom: 6px;
      color: #a0aec0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-label {
      font-weight: 500;
    }
    .metric-value {
      color: #4ade80;
      font-weight: bold;
      font-family: 'Courier New', monospace;
    }
    #status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 8px;
      background: rgba(74, 220, 90, 0.2);
      color: #4adc5a;
      border: 1px solid #4adc5a;
    }
    #controls-hint {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(18, 22, 33, 0.8);
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 12px;
      color: #a0aec0;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="info-panel">
    <h3>⚙️ ${shape.deviceType} Twin</h3>
    <div class="metric-section">
      ${metricRowsHtml}
    </div>
    <div id="status-badge">✓ OPERATIONAL</div>
  </div>

  <div id="controls-hint">
    🖱️ Drag to rotate | Scroll to zoom
  </div>

  <div id="canvas-container"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script>
    // ============ SCENE SETUP ============
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1419);
    scene.fog = new THREE.Fog(0x0f1419, 10, 50);

    // ============ CAMERA ============
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(3, 3, 5);
    camera.lookAt(0, 0, 0);

    // ============ RENDERER ============
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ============ LIGHTING ============
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 10, 7);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x4a90d9, 0.4);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Grid helper
    const gridHelper = new THREE.GridHelper(6, 20, 0x4a90d9, 0x2d3748);
    gridHelper.position.y = -1.1;
    gridHelper.receiveShadow = true;
    scene.add(gridHelper);

    // ============ DEVICE GEOMETRIES ============
    ${partGroupCode}

    scene.add(deviceGroup);

    // ============ MOUSE CONTROLS ============
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    window.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y
      };

      deviceGroup.rotation.y += deltaMove.x * 0.007;
      deviceGroup.rotation.x += deltaMove.y * 0.007;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch controls
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaMove = {
        x: e.touches[0].clientX - previousMousePosition.x,
        y: e.touches[0].clientY - previousMousePosition.y
      };

      deviceGroup.rotation.y += deltaMove.x * 0.007;
      deviceGroup.rotation.x += deltaMove.y * 0.007;

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });

    // Zoom controls via scroll wheel
    window.addEventListener('wheel', (e) => {
      const zoomSpeed = 0.1;
      camera.position.z += e.deltaY * 0.01 * zoomSpeed;
      camera.position.z = Math.max(2, Math.min(15, camera.position.z));
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ============ ANIMATION LOOP ============
    function animate() {
      requestAnimationFrame(animate);
      
      if (typeof updateDeviceParts === 'function') {
        updateDeviceParts();
      }

      // Auto-rotation when not dragging
      if (!isDragging) {
        deviceGroup.rotation.y += 0.003;
      }

      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>`;
}
//# sourceMappingURL=scene-builder.js.map