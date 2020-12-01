const router = require("express").Router();

//#region 儲存及獲取查詢參數
router.post("/qs" , require("./controller/postSearchQs"));

router.get("/qs" , require("./controller/getSearchQs"));

router.get("/content/:id" ,require("./controller/getContent"));
//#endregion
module.exports = router;