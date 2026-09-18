const fs = require('fs');
const path = 'C:/---------DIEGO/Aitems_V2/aitem_back_v3/Controllers/Properties-Controllers.js';
let content = fs.readFileSync(path, 'utf8');

const newMethods = `
const deleteImagesBatch = async (req, res) => {
  try {
    const { photoIds } = req.body;
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ success: false, message: "photoIds array is required" });
    }
    const { error } = await supabase
      .from("images")
      .delete()
      .in("id", photoIds);

    if (error) {
      console.error("Error al eliminar imágenes en batch:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(200).json({ success: true, message: "Imágenes eliminadas correctamente" });
  } catch (error) {
    console.error("Error en deleteImagesBatch:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const moveImagesBatch = async (req, res) => {
  try {
    const { photoIds, targetRoom } = req.body;
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0 || !targetRoom) {
      return res.status(400).json({ success: false, message: "photoIds array and targetRoom are required" });
    }
    const { error } = await supabase
      .from("images")
      .update({ room: targetRoom })
      .in("id", photoIds);

    if (error) {
      console.error("Error al mover imágenes en batch:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(200).json({ success: true, message: "Imágenes movidas correctamente" });
  } catch (error) {
    console.error("Error en moveImagesBatch:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
`;

if (!content.includes('deleteImagesBatch')) {
  content = content.replace('module.exports = {', newMethods + '\nmodule.exports = {');
  content = content.replace('deleteProperty,', 'deleteProperty,\n  deleteImagesBatch,\n  moveImagesBatch,');
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully updated Properties-Controllers.js');
} else {
  console.log('Already had deleteImagesBatch in Properties-Controllers.js');
}

// Now update Routes
const routesPath = 'C:/---------DIEGO/Aitems_V2/aitem_back_v3/Routes/Properties-Routes.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');
if (!routesContent.includes('deleteImagesBatch')) {
  routesContent = routesContent.replace('deleteProperty \n}', 'deleteProperty,\n  deleteImagesBatch,\n  moveImagesBatch\n}');
  routesContent = routesContent.replace('deleteProperty\n}', 'deleteProperty,\n  deleteImagesBatch,\n  moveImagesBatch\n}');
  routesContent = routesContent.replace('deleteProperty,', 'deleteProperty,\n  deleteImagesBatch,\n  moveImagesBatch,');
  
  const routeDefinitions = `
router.delete("/images/batch", authenticateToken, deleteImagesBatch);
router.put("/images/batch-move", authenticateToken, moveImagesBatch);
`;
  routesContent = routesContent.replace('router.delete("/:id"', routeDefinitions + '\nrouter.delete("/:id"');
  fs.writeFileSync(routesPath, routesContent, 'utf8');
  console.log('Successfully updated Properties-Routes.js');
} else {
  console.log('Already had routes in Properties-Routes.js');
}
