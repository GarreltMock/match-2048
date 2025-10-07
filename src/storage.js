// LocalStorage persistence utilities

export function loadNumberBase() {
    const saved = localStorage.getItem("match2048_numberBase");
    return saved ? parseInt(saved, 10) : 2;
}

export function saveNumberBase(numberBase) {
    localStorage.setItem("match2048_numberBase", numberBase.toString());
}

export function loadShowReviewBoard() {
    const saved = localStorage.getItem("match2048_showReviewBoard");
    return saved === null ? true : saved === "true";
}

export function saveShowReviewBoard(showReviewBoard) {
    localStorage.setItem("match2048_showReviewBoard", showReviewBoard.toString());
}

export function loadSpecialTileConfig() {
    const saved = localStorage.getItem("match2048_specialTileConfig");
    if (saved) {
        return JSON.parse(saved);
    }
    // Default configuration: all special tiles disabled
    return {
        line_4: "none",
        block_4: "none",
        line_5: "none",
        t_formation: "none",
        l_formation: "none",
    };
}

export function saveSpecialTileConfig(specialTileConfig) {
    localStorage.setItem("match2048_specialTileConfig", JSON.stringify(specialTileConfig));
}

export function loadCurrentLevel() {
    const savedLevel = localStorage.getItem("match2048_currentLevel");
    return savedLevel ? parseInt(savedLevel, 10) : 1;
}

export function saveCurrentLevel(currentLevel) {
    localStorage.setItem("match2048_currentLevel", currentLevel.toString());
}

export function loadScore() {
    const savedScore = localStorage.getItem("match2048_score");
    return savedScore ? parseInt(savedScore, 10) : 0;
}

export function saveScore(score) {
    localStorage.setItem("match2048_score", score.toString());
}

export function loadUseTestLevels() {
    const saved = localStorage.getItem("match2048_useTestLevels");
    return saved === "true";
}

export function saveUseTestLevels(useTestLevels) {
    localStorage.setItem("match2048_useTestLevels", useTestLevels.toString());
}
