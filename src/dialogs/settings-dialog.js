// Settings and info dialog setup - extracted from game.js

import { LEVEL_CONFIGS, DEFAULT_LEVEL } from "../config.js";
import {
    saveCurrentLevel,
    saveLevelConfigKey,
    saveRespectsLocks,
    loadUserId,
    saveBoardUpgradeAction,
    saveSuperUpgradeAction,
    saveSpecialTileConfig,
    saveHintsEnabled,
    saveShowSwapTargets,
    saveHintTimeoutMs,
    saveAllowNonMatchingSwaps,
    saveExtendedFreeSwap,
    saveFormationPowerUpRewards,
    savePersistentPowerUpsEnabled,
    savePowerUpMoveCost,
    saveSelectedPowerUps,
    saveSuperStrikeWildcardTeleport,
    saveMovesMultiplier,
    saveSolverHintEnabled,
    saveTryAgainEnabled,
    saveDisplayBase,
} from "../storage.js";
import { setDisplayBase } from "../tile-helpers.js";
import { APP_VERSION } from "../version.js";
import { cyrb53 } from "../tracker.js";
import { updateIntroDialogPowerupsList } from "./goal-dialogs.js";

export function setupSettingsButton(game) {
    const homeTitle = document.getElementById("homeTitle");
    const settingsDialog = document.getElementById("settingsDialog");
    const saveSettingsBtn = document.getElementById("saveSettings");
    const levelSelect = document.getElementById("levelSelect");
    const levelConfigSelect = document.getElementById("levelConfigSelect");
    const boardUpgradeActionSelect = document.getElementById("boardUpgradeAction");
    const superUpgradeActionSelect = document.getElementById("superUpgradeAction");
    let selectedLevelConfigKey = game.levelConfigKey;

    const line4Select = document.getElementById("line4Reward");
    const block4Select = document.getElementById("block4Reward");
    const line5Select = document.getElementById("line5Reward");
    const tFormationSelect = document.getElementById("tFormationReward");
    const lFormationSelect = document.getElementById("lFormationReward");

    const showSwapTargetsCheckbox = document.getElementById("showSwapTargets");
    const hintsEnabledCheckbox = document.getElementById("hintsEnabled");
    const hintTimeoutInput = document.getElementById("hintTimeoutMs");
    const allowNonMatchingSwapsCheckbox = document.getElementById("allowNonMatchingSwaps");
    const extendedFreeSwapCheckbox = document.getElementById("extendedFreeSwap");
    const formationPowerUpRewardsCheckbox = document.getElementById("formationPowerUpRewards");
    const persistentPowerUpsEnabledCheckbox = document.getElementById("persistentPowerUpsEnabled");
    const powerUpMoveCostCheckbox = document.getElementById("powerUpMoveCost");
    const superStrikeWildcardTeleportCheckbox = document.getElementById("superStrikeWildcardTeleport");
    const movesMultiplierInput = document.getElementById("movesMultiplier");
    const solverHintEnabledCheckbox = document.getElementById("solverHintEnabled");
    const tryAgainEnabledCheckbox = document.getElementById("tryAgainEnabled");
    const displayBaseSelect = document.getElementById("displayBase");

    const togglePowerUpOptions = (show) => {
        const powerupOptions = document.querySelectorAll(".powerup-option");
        const regularOptions = document.querySelectorAll(".regular-option");
        const regularHelp = document.querySelector(".special-tile-help:not(.powerup-help)");
        const powerupHelp = document.querySelector(".special-tile-help.powerup-help");

        powerupOptions.forEach((option) => {
            option.style.display = show ? "block" : "none";
        });
        regularOptions.forEach((option) => {
            option.style.display = show ? "none" : "block";
        });
        if (regularHelp) regularHelp.style.display = show ? "none" : "block";
        if (powerupHelp) powerupHelp.style.display = show ? "block" : "none";
    };

    const populateLevelSelect = () => {
        if (levelSelect) {
            levelSelect.innerHTML = "";
            for (let i = 1; i <= game.levels.length; i++) {
                const option = document.createElement("option");
                option.value = i;
                const levelConfig = game.levels[i - 1];
                option.textContent = levelConfig.title ? `Level ${i} - ${levelConfig.title}` : `Level ${i}`;
                levelSelect.appendChild(option);
            }
        }
    };

    const populateLevelConfigSelect = () => {
        if (levelConfigSelect) {
            levelConfigSelect.innerHTML = "";
            LEVEL_CONFIGS.forEach((config) => {
                const option = document.createElement("option");
                option.value = config.key;
                option.textContent = config.name;
                levelConfigSelect.appendChild(option);
            });
        }
    };

    populateLevelConfigSelect();
    populateLevelSelect();

    if (levelConfigSelect) {
        levelConfigSelect.addEventListener("change", () => {
            selectedLevelConfigKey = levelConfigSelect.value;
            const config = LEVEL_CONFIGS.find((c) => c.key === selectedLevelConfigKey);
            game.levels = config ? config.levels : DEFAULT_LEVEL;
            populateLevelSelect();
            if (levelSelect) {
                levelSelect.value = "1";
            }
        });
    }

    const updatePowerUpSelectionState = () => {
        const cbs = document.querySelectorAll(".powerup-select-cb");
        const checkedCount = Array.from(cbs).filter((cb) => cb.checked).length;
        cbs.forEach((cb) => {
            if (!cb.checked) {
                cb.disabled = checkedCount >= 3;
            }
        });
    };

    document.querySelectorAll(".powerup-select-cb").forEach((cb) => {
        cb.addEventListener("change", updatePowerUpSelectionState);
    });

    const openSettings = () => {
        populateLevelSelect();

        if (levelSelect) {
            const maxLevel = game.levels.length;
            if (game.currentLevel > maxLevel) {
                game.currentLevel = 1;
            }
            levelSelect.value = game.currentLevel.toString();
        }
        levelConfigSelect.value = selectedLevelConfigKey;
        if (boardUpgradeActionSelect) boardUpgradeActionSelect.value = game.boardUpgradeAction;
        if (superUpgradeActionSelect) superUpgradeActionSelect.value = game.superUpgradeAction;

        togglePowerUpOptions(false);

        line4Select.value = game.specialTileConfig.line_4;
        block4Select.value = game.specialTileConfig.block_4;
        line5Select.value = game.specialTileConfig.line_5;
        tFormationSelect.value = game.specialTileConfig.t_formation;
        lFormationSelect.value = game.specialTileConfig.l_formation;

        if (showSwapTargetsCheckbox) {
            showSwapTargetsCheckbox.checked = game.showSwapTargets;
        }
        if (hintsEnabledCheckbox) {
            hintsEnabledCheckbox.checked = game.hintsEnabled;
        }
        if (hintTimeoutInput) {
            hintTimeoutInput.value = String(game.hintTimeout);
        }
        if (allowNonMatchingSwapsCheckbox) {
            allowNonMatchingSwapsCheckbox.checked = game.allowNonMatchingSwaps;
        }
        if (extendedFreeSwapCheckbox) {
            extendedFreeSwapCheckbox.checked = game.extendedFreeSwap;
        }
        if (formationPowerUpRewardsCheckbox) {
            formationPowerUpRewardsCheckbox.checked = game.formationPowerUpRewards;
        }
        if (persistentPowerUpsEnabledCheckbox) {
            persistentPowerUpsEnabledCheckbox.checked = game.persistentPowerUpsEnabled;
        }
        if (powerUpMoveCostCheckbox) {
            powerUpMoveCostCheckbox.checked = game.powerUpMoveCost;
        }
        if (superStrikeWildcardTeleportCheckbox) {
            superStrikeWildcardTeleportCheckbox.checked = game.superStrikeWildcardTeleport;
        }
        if (movesMultiplierInput) {
            movesMultiplierInput.value = String(game.movesMultiplier);
        }
        if (solverHintEnabledCheckbox) {
            solverHintEnabledCheckbox.checked = game.solverHintEnabled;
        }
        if (tryAgainEnabledCheckbox) {
            tryAgainEnabledCheckbox.checked = game.tryAgainEnabled;
        }
        if (displayBaseSelect) {
            displayBaseSelect.value = String(game.displayBase);
        }

        const powerUpCheckboxes = document.querySelectorAll(".powerup-select-cb");
        powerUpCheckboxes.forEach((cb) => {
            cb.checked = game.selectedPowerUps.includes(cb.value);
        });
        updatePowerUpSelectionState();

        const userIdDisplay = document.getElementById("userIdDisplay");
        if (userIdDisplay) {
            userIdDisplay.textContent = cyrb53(loadUserId());
        }

        const versionDisplay = document.getElementById("versionDisplay");
        if (versionDisplay) {
            versionDisplay.textContent = APP_VERSION;
        }

        const copyUserIdBtn = document.getElementById("copyUserIdBtn");
        if (copyUserIdBtn && userIdDisplay) {
            const newCopyBtn = copyUserIdBtn.cloneNode(true);
            copyUserIdBtn.parentNode.replaceChild(newCopyBtn, copyUserIdBtn);

            newCopyBtn.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(userIdDisplay.textContent);
                    newCopyBtn.textContent = "Copied!";
                    setTimeout(() => {
                        newCopyBtn.textContent = "Copy";
                    }, 2000);
                } catch (err) {
                    console.error("Failed to copy:", err);
                    newCopyBtn.textContent = "Failed";
                    setTimeout(() => {
                        newCopyBtn.textContent = "Copy";
                    }, 2000);
                }
            });
        }

        settingsDialog.classList.remove("hidden");
    };

    const settingsDisabled = new URLSearchParams(window.location.search).has("noSettings");

    if (homeTitle && settingsDialog && !settingsDisabled) {
        homeTitle.addEventListener("click", openSettings);

        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener("click", () => {
                let levelChanged = false;
                let levelSetChanged = false;

                if (selectedLevelConfigKey !== game.levelConfigKey) {
                    game.levelConfigKey = selectedLevelConfigKey;
                    const config = LEVEL_CONFIGS.find((c) => c.key === game.levelConfigKey);
                    const respectsLocks = config ? config.respectsFeatureLocks : true;
                    saveLevelConfigKey(game.levelConfigKey);
                    saveRespectsLocks(respectsLocks);
                    levelSetChanged = true;
                    levelChanged = true;
                }

                if (levelSelect) {
                    const newLevel = parseInt(levelSelect.value, 10);
                    if (newLevel !== game.currentLevel || levelSetChanged) {
                        levelChanged = true;
                        game.currentLevel = newLevel;
                        saveCurrentLevel(game.currentLevel);
                    }
                }

                if (boardUpgradeActionSelect) {
                    game.boardUpgradeAction = boardUpgradeActionSelect.value;
                    saveBoardUpgradeAction(game.boardUpgradeAction);
                }
                if (superUpgradeActionSelect) {
                    game.superUpgradeAction = superUpgradeActionSelect.value;
                    saveSuperUpgradeAction(game.superUpgradeAction);
                }

                game.specialTileConfig.line_4 = line4Select.value;
                game.specialTileConfig.block_4 = block4Select.value;
                game.specialTileConfig.line_5 = line5Select.value;
                game.specialTileConfig.t_formation = tFormationSelect.value;
                game.specialTileConfig.l_formation = lFormationSelect.value;
                saveSpecialTileConfig(game.specialTileConfig);

                if (showSwapTargetsCheckbox) {
                    game.showSwapTargets = showSwapTargetsCheckbox.checked;
                    saveShowSwapTargets(game.showSwapTargets);
                }
                if (hintsEnabledCheckbox) {
                    game.hintsEnabled = hintsEnabledCheckbox.checked;
                    saveHintsEnabled(game.hintsEnabled);
                }
                if (hintTimeoutInput) {
                    const n = parseInt(hintTimeoutInput.value, 10);
                    game.hintTimeout = Number.isFinite(n) && n >= 0 ? n : 4000;
                    saveHintTimeoutMs(game.hintTimeout);
                }
                if (allowNonMatchingSwapsCheckbox) {
                    game.allowNonMatchingSwaps = allowNonMatchingSwapsCheckbox.checked;
                    saveAllowNonMatchingSwaps(game.allowNonMatchingSwaps);
                }
                if (extendedFreeSwapCheckbox) {
                    game.extendedFreeSwap = extendedFreeSwapCheckbox.checked;
                    saveExtendedFreeSwap(game.extendedFreeSwap);
                }
                if (formationPowerUpRewardsCheckbox) {
                    game.formationPowerUpRewards = formationPowerUpRewardsCheckbox.checked;
                    saveFormationPowerUpRewards(game.formationPowerUpRewards);
                }
                if (persistentPowerUpsEnabledCheckbox) {
                    game.persistentPowerUpsEnabled = persistentPowerUpsEnabledCheckbox.checked;
                    savePersistentPowerUpsEnabled(game.persistentPowerUpsEnabled);
                }
                if (powerUpMoveCostCheckbox) {
                    game.powerUpMoveCost = powerUpMoveCostCheckbox.checked;
                    savePowerUpMoveCost(game.powerUpMoveCost);
                }
                if (superStrikeWildcardTeleportCheckbox) {
                    game.superStrikeWildcardTeleport = superStrikeWildcardTeleportCheckbox.checked;
                    saveSuperStrikeWildcardTeleport(game.superStrikeWildcardTeleport);
                }
                if (movesMultiplierInput) {
                    const n = parseFloat(movesMultiplierInput.value);
                    game.movesMultiplier = Number.isFinite(n) && n > 0 ? n : 1.0;
                    saveMovesMultiplier(game.movesMultiplier);
                }
                if (solverHintEnabledCheckbox) {
                    game.solverHintEnabled = solverHintEnabledCheckbox.checked;
                    saveSolverHintEnabled(game.solverHintEnabled);
                }
                if (tryAgainEnabledCheckbox) {
                    game.tryAgainEnabled = tryAgainEnabledCheckbox.checked;
                    saveTryAgainEnabled(game.tryAgainEnabled);
                }
                if (displayBaseSelect) {
                    const base = parseInt(displayBaseSelect.value, 10);
                    game.displayBase = base;
                    saveDisplayBase(base);
                    setDisplayBase(base);
                }

                const selectedCbs = document.querySelectorAll(".powerup-select-cb:checked");
                const selected = Array.from(selectedCbs).map((cb) => cb.value);
                if (selected.length === 3) {
                    game.selectedPowerUps = selected;
                    saveSelectedPowerUps(game.selectedPowerUps);
                    game.showPowerUps();
                    game.updatePowerUpButtons();
                }

                if (game.gameActive && !levelChanged) {
                    game.settingsChangedDuringLevel = true;
                }

                if (levelChanged) {
                    location.reload();
                } else {
                    if (game.board && game.board.length > 0) game.renderBoard();
                    settingsDialog.classList.add("hidden");
                }
            });
        }

        settingsDialog.addEventListener("click", (e) => {
            if (e.target === settingsDialog) {
                settingsDialog.classList.add("hidden");
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !settingsDialog.classList.contains("hidden")) {
                settingsDialog.classList.add("hidden");
            }
        });
    }
}

export function setupInfoButton(game) {
    const openIntroDialog = (e) => {
        e.stopPropagation();
        updateIntroDialogPowerupsList(game);

        const introDialog = document.getElementById("introDialog");
        introDialog.classList.remove("hidden");

        const startBtn = document.getElementById("startGame");

        const closeDialog = () => {
            introDialog.classList.add("hidden");
        };

        const newStartBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newStartBtn, startBtn);

        newStartBtn.addEventListener("click", closeDialog);

        introDialog.addEventListener(
            "click",
            (e) => {
                if (e.target === introDialog) {
                    closeDialog();
                }
            },
            { once: true },
        );

        document.addEventListener(
            "keydown",
            (e) => {
                if (e.key === "Escape" && !introDialog.classList.contains("hidden")) {
                    closeDialog();
                }
            },
            { once: true },
        );
    };

    const infoBtn = document.getElementById("infoBtn");
    if (infoBtn) {
        infoBtn.addEventListener("click", openIntroDialog);
    }

    const infoBtnGame = document.getElementById("infoBtnGame");
    if (infoBtnGame) {
        infoBtnGame.addEventListener("click", openIntroDialog);
    }

    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (
                confirm("Are you sure you want to reset all progress? This will delete your saved level and score.")
            ) {
                localStorage.clear();
                location.reload();
            }
        });
    }
}
