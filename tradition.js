/** @type {HTMLCanvasElement} */
const tCanvas = document.getElementById("traditionGraph")
/** @type {HTMLCanvasElement} */
const pCanvas = document.getElementById("pipGraph")
const tctx = tCanvas.getContext('2d')
const pctx = pCanvas.getContext('2d')

var tradStart = 20.0
var tradGain = 0.0
var tradVarGain = 0.0
var tradDecayRed = 0.00

var addFire = 0
var addShock = 0
var addManeuver = 0
var addSiege = 0

/**
 * @param {number} start 
 * @param {number} gain 
 * @param {number} decayReduction
 * @returns {number[]}
 */
function traditionList(start, gain, decayReduction) {
    let months = [start]
    let prev = start
    while (true) {
        let current = Math.min(100, prev * (1 - 0.05 + decayReduction) + gain)
        months.push(current)
        if (Math.abs(current - prev) < 0.01) {
            return months
        } else {
            prev = current
        }
    }
}

/**
 * 
 * @param {number} roll The sum of all rolled pips to be added to bonus pips.
 * @returns The final pip sum. Will not exceed 24.
 */
function addBonusPips(roll) {
    return Math.min(24, addFire + addShock + addManeuver + addSiege + roll)
}

/**
 * Calculates the minimum possible number of pips for a tradition level if all rolls are 0%.
 * @param {number} tradition 
 * @returns {number}
 */
function minPips(tradition) {
    return addBonusPips(1 + Math.floor(tradition / 20) + Math.floor(tradition / 100))
}

/**
 * Calculates the maximum possible number of pips for a tradition level if all rolls are 100%.
 * @param {number} tradition 
 * @returns {number}
 */
function maxPips(tradition) {
    return addBonusPips(6 + Math.floor(tradition / 20) + (tradition > 0) + (tradition > 20) + (tradition > 40) + (tradition > 60) + (tradition > 80) + 1)
}

/**
 * Returns a modified version of the list for a given probability of +1.
 * @param {number} prob 
 * @param {number[]} items 
 * @returns {number[]}
 */
function probIncrease(prob, items) {
    list = []
    for (let i = 0; i < items.length; i++) {
        if (i == 0) {
            list.push(items[i] * (1 - prob))
        } else {
            list.push(items[i] * (1 - prob) + items[i - 1] * prob)
        }
    }
    return list
}

/**
 * Calculates the probability distribution for leader pips given a tradition level.
 * @param {number} tradition 
 * @returns {number[]} An array of probabilities of rolling each pips. Sum of 1.
 */
function pipProb(tradition) {
    // Initial probability roll for 6
    let p6 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (let i = 1 + Math.floor(tradition / 20); i < 1 + Math.floor(tradition / 20) + 6; i++) {
        p6[i] = 1/6;
    }

    // Tradition rolls
    let t7 = probIncrease(tradition / 100, p6)
    let t8 = probIncrease(Math.max(0, tradition - 20) / 100, t7)
    let t9 = probIncrease(Math.max(0, tradition - 40) / 100, t8)
    let t10 = probIncrease(Math.max(0, tradition - 60) / 100, t9)
    let t11 = probIncrease(Math.max(0, tradition - 80) / 100, t10)
    // 1/2 chance
    return probIncrease(1 / 2, t11)
}

/**
 * Gets the first pip count at which a given probability of rolling it is met.
 * @param {number} prob
 * @param {number[]} pipProbs An array with the probability of each possible pip count (not cumulative; sum of all items should be 1)
 * @returns {number} The number of pips.
 */
function leastProb(prob, pipProbs) {
    let probSum = 0
    for (let i = 0; i < pipProbs.length; i++) {
        probSum += pipProbs[i]
        if (probSum > prob) {
            return i
        }
    }
    return 0
}

/**
 * Gets the first pip count at which a given probability of rolling is met over time, including bonus pips.
 * @param {number} prob
 * @param {number[][]} pipProbs An array for each year containing arrays of the probability of each possible pip count (not cumulative)
 * @return {number[]} An array containing the pip count for each year for the probability.
 */
function eachProbs(prob, pipProbs) {
    return pipProbs.map(p => addBonusPips(leastProb(prob, p)))
}

class graphLine {
    /**
     * @param {number[]} items 
     * @param {string} style 
     * @param {number} width 
     */
    constructor(items, style = null, width = null) {
        this.items = items
        this.style = style
        this.width = width
    }
}

/**
 * @param {graphLine[]} lines 
 * @param {CanvasRenderingContext2D} context
 * @param {number} xincrement
 * @param {number} ymax
 * @param {number} yincrement 
 */
function drawGraph(lines, context, xincrement, ymax, yincrement, xlabel = "X", ylabel = "Y") {
    if (lines instanceof graphLine) {
        lines = [lines]
    }

    let width = context.canvas.width
    let height = context.canvas.height

    const border = 10

    const xaxisdist = 20
    const yaxisdist = 30

    let tickcap = 0
    for (let line of lines) {
        let cap = Math.ceil(line.items.length / xincrement)
        if (cap > tickcap) {
            tickcap = cap
        }
    }

    context.clearRect(0, 0, width, height)
    // Draw Graph Box
    context.strokeStyle = "white"
    context.fillStyle = "white"
    context.font = "16px Garamond"

    context.beginPath()
    // Y-axis
    context.moveTo(yaxisdist + border, 0)
    context.lineTo(yaxisdist + border, height - xaxisdist - border)
    // Draw dashes every 10 from 0 (exclusive) to 100 (inclusive)
    // We actually work from the top down
    context.textAlign = "right"
    for (let i = 0; i < ymax / yincrement; i++) {
        let dashY = (height - xaxisdist - 2 * border) * i * yincrement / ymax + border
        context.moveTo(yaxisdist + border - 3, dashY)
        context.lineTo(yaxisdist + border + 3, dashY)
        context.fillText(ymax - i * yincrement, yaxisdist + border - 6, dashY + 4)
    }
    context.font = "20px Garamond"
    context.textAlign = "center"
    context.save()
    context.rotate(Math.PI/2)
    context.fillText(ylabel, height/2, -5)
    context.restore()
    context.font = "16px Garamond"

    // X-axis
    context.moveTo(yaxisdist + border, height - xaxisdist - border)
    context.lineTo(width - border, height - xaxisdist - border)
    // Draw dashes every 12 months
    
    for (let i = 0; i < tickcap; i++) {
        let dashX = (width - border) * i / tickcap + border + yaxisdist
        context.moveTo(dashX, height - xaxisdist - border - 3)
        context.lineTo(dashX, height - xaxisdist - border + 3)
        context.fillText(i * xincrement, dashX, height - xaxisdist - border + 14)
    }
    context.font = "20px Garamond"
    context.fillText(xlabel, width/2, height-5)
    context.stroke()

    /**
     * @param {number} value 
     */
    function graphLocX(value) {
        return yaxisdist + border + value / (tickcap * xincrement) * (width - yaxisdist - 2 * border)
    }

    /**
     * @param {number} value 
     */
    function graphLocY(value) {
        return (height - xaxisdist - 2 * border) * (1 - value / ymax) + border
    }

    // Draw graph line
    for (let line of lines) {
        items = line.items
        // Formatting
        if (line.style == null) {
            context.strokeStyle = "white"
        } else {
            context.strokeStyle = line.style
        }
        context.lineWidth = line.width
        if (line.style == null) {
            context.lineWidth = 1
        } else {
            context.lineWidth = line.width
        }
        // Draw
        context.beginPath()
        context.moveTo(graphLocX(0), graphLocY(items[0]))
        for (let i = 1; i < items.length; i++) {
            context.lineTo(graphLocX(i), graphLocY(items[i]))
        }
        context.lineTo(width - border, graphLocY(items[items.length - 1]))
        context.stroke()
    }
}

// Now register sliders and stuff
// Starting Tradition
const startlabel = document.getElementById("startlabel")
const startslider = document.getElementById("startslider")
function updateStart() {
    tradStart = Number(startslider.value)
    startlabel.innerHTML = "Starting Tradition: " + startslider.value
    update()
}
// Tradition Gain
const gainlabel = document.getElementById("gainlabel")
const gainslider = document.getElementById("gainslider")
function updateGain() {
    tradGain = Number(gainslider.value)
    gainlabel.innerHTML = "Yearly Tradition Gain: " + gainslider.value
    update()
}
// Decay Reduction
const decayreductionlabel = document.getElementById("decayreductionlabel")
const decayslider = document.getElementById("decayreductionslider")
function updateDecayReduction() {
    tradDecayRed = Number(decayslider.value)
    decayreductionlabel.innerHTML = "Tradition Decay Reduction: " + decayslider.value
    update()
}

// Bonus Pips
// Fire
const firepiplabel = document.getElementById("firepiplabel")
const firepipslider = document.getElementById("firepipslider")
function updateFirePips() {
    addFire = Number(firepipslider.value)
    firepiplabel.innerHTML = "Leader Fire: " + firepipslider.value
    update()
}
// Shock
const shockpiplabel = document.getElementById("shockpiplabel")
const shockpipslider = document.getElementById("shockpipslider")
function updateShockPips() {
    addShock = Number(shockpipslider.value)
    shockpiplabel.innerHTML = "Leader Shock: " + shockpipslider.value
    update()
}
// Maneuver
const maneuverpiplabel = document.getElementById("maneuverpiplabel")
const maneuverpipslider = document.getElementById("maneuverpipslider")
function updateManeuverPips() {
    addManeuver = Number(maneuverpipslider.value)
    maneuverpiplabel.innerHTML = "Leader Maneuver: " + maneuverpipslider.value
    update()
}
// Siege
const siegepiplabel = document.getElementById("siegepiplabel")
const siegepipslider = document.getElementById("siegepipslider")
function updateSiegePips() {
    addSiege = Number(siegepipslider.value)
    siegepiplabel.innerHTML = "Leader Siege: " + siegepipslider.value
    update()
}

startslider.oninput = updateStart
gainslider.oninput = updateGain
decayslider.oninput = updateDecayReduction

firepipslider.oninput = updateFirePips
shockpipslider.oninput = updateShockPips
maneuverpipslider.oninput = updateManeuverPips
siegepipslider.oninput = updateSiegePips

// Register resize event
function resize() {
    tctx.canvas.width = document.getElementById("traditionGraphFrame").clientWidth * (700/795)
    tctx.canvas.height = document.getElementById("traditionGraphFrame").clientHeight * (480/605)
    pctx.canvas.width = document.getElementById("pipGraphFrame").clientWidth * (700/795)
    pctx.canvas.height = document.getElementById("pipGraphFrame").clientHeight * (480/605)
}
window.addEventListener("resize", ()=>{resize();update()})


function update() {
    let tradition = traditionList(tradStart, tradGain, tradDecayRed)
    let vartrad = traditionList(tradStart, tradGain + tradVarGain, tradDecayRed)

    drawGraph([new graphLine(tradition, "grey"), new graphLine(vartrad)], tctx, 10, 100, 10, "Years", "Military Tradition")

    let timemap = tradition.map(pipProb)
    let vartimemap = vartrad.map(pipProb)

    let pipLines = []
    for (let i = 0; i <= 1; i += 0.05) {
        pipLines.push(new graphLine(eachProbs(i, timemap), "rgb(" + 255 * (1 - i) + "," + 255 * i + ",0)", 4 - Math.abs(8 * i - 4)))
    }
    pipLines.push(new graphLine(tradition.map(minPips), "white", 1))
    pipLines.push(new graphLine(tradition.map(maxPips), "white", 1))
    drawGraph(pipLines, pctx, 10, 24, 1, "Years", "Leader Pips")
}


startlabel.innerHTML = "Starting Tradition: " + startslider.value
gainlabel.innerHTML = "Yearly Tradition Gain: " + gainslider.value
decayreductionlabel.innerHTML = "Tradition Decay Reduction: " + decayslider.value

firepiplabel.innerHTML = "Leader Fire: " + firepipslider.value
shockpiplabel.innerHTML = "Leader Shock: " + shockpipslider.value
maneuverpiplabel.innerHTML = "Leader Maneuver: " + maneuverpipslider.value
siegepiplabel.innerHTML = "Leader Siege: " + siegepipslider.value

resize()
update()