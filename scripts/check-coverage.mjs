#!/usr/bin/env bun
import fs from "node:fs/promises";

function getArg(name, fallback) {
	const index = process.argv.indexOf(name);
	if (index === -1 || index + 1 >= process.argv.length) {
		return fallback;
	}
	return process.argv[index + 1];
}

function toPercent(hit, found) {
	if (!found) return 100;
	return (hit / found) * 100;
}

function formatPercent(value) {
	return value.toFixed(2);
}

const lcovPath = getArg("--lcov", ".tmp/coverage/lcov.info");
const minLinePercent = Number(getArg("--lines", "99.75"));
const minFuncPercent = Number(getArg("--funcs", "97.85"));

if (Number.isNaN(minLinePercent) || Number.isNaN(minFuncPercent)) {
	console.error("Coverage thresholds must be numbers.");
	process.exit(1);
}

let content;
try {
	content = await fs.readFile(lcovPath, "utf8");
} catch (error) {
	console.error(`Failed to read LCOV file at ${lcovPath}.`);
	console.error(error);
	process.exit(1);
}

const lines = content.split(/\r?\n/);
let totalLinesFound = 0;
let totalLinesHit = 0;
let totalFuncsFound = 0;
let totalFuncsHit = 0;

for (const line of lines) {
	if (line.startsWith("LF:")) {
		totalLinesFound += Number(line.slice(3));
	} else if (line.startsWith("LH:")) {
		totalLinesHit += Number(line.slice(3));
	} else if (line.startsWith("FNF:")) {
		totalFuncsFound += Number(line.slice(4));
	} else if (line.startsWith("FNH:")) {
		totalFuncsHit += Number(line.slice(4));
	}
}

if (totalLinesFound === 0 && totalFuncsFound === 0) {
	console.error("No coverage totals found in LCOV file.");
	process.exit(1);
}

const linePercent = toPercent(totalLinesHit, totalLinesFound);
const funcPercent = toPercent(totalFuncsHit, totalFuncsFound);

console.log("Coverage check summary");
console.log(
	`Lines: ${formatPercent(linePercent)}% (required >= ${formatPercent(minLinePercent)}%)`,
);
console.log(
	`Funcs: ${formatPercent(funcPercent)}% (required >= ${formatPercent(minFuncPercent)}%)`,
);

const linePass = linePercent + Number.EPSILON >= minLinePercent;
const funcPass = funcPercent + Number.EPSILON >= minFuncPercent;

if (!linePass || !funcPass) {
	console.error("Coverage threshold check failed.");
	process.exit(1);
}

console.log("Coverage threshold check passed.");
