// biome-ignore assist/source/organizeImports: cause TS
import type { Declaration, PluginCreator } from 'postcss';
const math = require('mathjs');

interface PluginOptions {
  basePixelSize?: number;
}

/**
 * PostCSS plugin to process do_math() functions in CSS declarations
 */
const plugin: PluginCreator<PluginOptions> = (opts: PluginOptions = {}) => {
  const basePixelSize = opts.basePixelSize ?? 16;

  return {
    postcssPlugin: 'postcss-do-math',

    // Process each declaration in the CSS
    Declaration(decl: Declaration): void {
      const v = processStringValue(decl.value, decl.prop, basePixelSize);
      if (v !== false) {
        decl.value = v;
      }
    },
    AtRule: {
      media(atRule) {
        const do_mathRegex = /do_math\((.*)\)(?=\))/g;
        const v = processStringValue(atRule.params, `@media ${atRule.params}`, basePixelSize, do_mathRegex);
        if (v !== false) {
          atRule.params = v;
        }
      },
    }
  };
};



function processStringValue(value: string, prop: string, basePixelSize: number, customRegex: RegExp | false = false): string | false {

    // Check if the value contains do_math()
    if (!value.includes('do_math(')) {
      return false;
    }

    // Regular expression to match do_math() functions
    // Handles nested parentheses
    // const do_mathRegex = /do_math\((.*)\)/g;
    // /do_math\(\s*([^()]+|\((?:[^()]+|\([^()]*\))*\))*\s*\)/g;
    const do_mathRegex = customRegex || /do_math\((.*)\)/g;

    let newValue = value;
    const match: RegExpExecArray | null = do_mathRegex.exec(value);


    // Find all do_math() occurrences in the value
    if ( match && match.length >= 2) {
      const fullMatch = match[0]; // e.g., "do_math(10 + 5)"
      const expression = match[1]; // e.g., "10 + 5"

      // Process the expression
      if ( expression) {
        const result = processExpression(expression, prop, basePixelSize);
        // Replace do_math() with the result
        newValue = newValue.replace(fullMatch, result);
      }

    }

    // Update the declaration value if it changed
    if (newValue !== value) {
      return newValue;
    }

    return false;
}



/**
 * Process the math expression inside do_math()
 * @param expression - The expression to evaluate
 * @param prop - The PostCSS proparation node
 * @param basePixelSize - Base pixel size for em/rem conversion
 * @returns The processed result
 */
function processExpression(expression: string, prop: string, basePixelSize: number): string {
  // Trim whitespace
  expression = expression.trim();

  try {
    // Find all numbers with units in the expression
    const unitMatches = expression.match(/([0-9.]+)([a-z%]+)/gi);
    let targetUnit = '';
    let hasPixels = false;
    let hasEmOrRem = false;
    let hasPercentage = false;

    if (unitMatches) {
      // Check what units are present
      const units = unitMatches.map(match => {
        const m = match.match(/([0-9.]+)([a-z%]+)/i);
        return m?.[2]?.toLowerCase() ?? '';
      });

      hasPixels = units.includes('px');
      hasEmOrRem = units.includes('em') || units.includes('rem');
      hasPercentage = units.includes('%');

      // If percentage is mixed with px/em/rem, return calc() function
      if (hasPercentage && (hasPixels || hasEmOrRem)) {
        // Convert em/rem to px if present with percentage
        let calcExpression = expression;

        if (unitMatches) {
          unitMatches.forEach(match => {
            const parts = match.match(/([0-9.]+)([a-z%]+)/i);
            if (parts?.[1] && parts?.[2]) {
              const value = parseFloat(parts[1]);
              const unit = parts[2].toLowerCase();

              // Convert em/rem to px
              if (unit === 'em' || unit === 'rem') {
                const pxValue = value * basePixelSize;
                calcExpression = calcExpression.replace(match, `${pxValue}px`);
              }
            }
          });
        }

        return `calc(${calcExpression})`;
      }

      // If mixing px with em/rem (no percentage), convert to px
      if (hasPixels && hasEmOrRem) {
        targetUnit = 'px';
      } else {
        // Use the first unit found
        targetUnit = `${units[0]}`;
      }

      // Check for mixed units (excluding px/em/rem combination which we handle)
      const uniqueUnits = [...new Set(units)];
      if (uniqueUnits.length > 1 && !(hasPixels && hasEmOrRem && uniqueUnits.length === 2)) {
        console.warn(`PostCSS do_math: Mixed units found in "${expression}" in ${prop}. Using unit: ${targetUnit}`);
      }
    }

    // Convert expression: replace each number+unit with converted value
    let cleanExpression = expression;

    if (unitMatches) {
      unitMatches.forEach(match => {
        const parts = match.match(/([0-9.]+)([a-z%]+)/i);
        if (parts?.[1] && parts?.[2]) {
          const value = parseFloat(parts[1]);
          const unit = parts[2].toLowerCase();
          let convertedValue = value;

          // Convert em/rem to px if mixing with px
          if (hasPixels && hasEmOrRem) {
            if (unit === 'em' || unit === 'rem') {
              convertedValue = value * basePixelSize;
            }
          }

          // Replace the match with just the number (converted if necessary)
          cleanExpression = cleanExpression.replace(match, convertedValue.toString());
        }
      });
    }

    // Evaluate the expression using mathjs
    const result = math.evaluate(cleanExpression) as number;

    // Format the result
    // Handle floating point precision
    const formattedResult = Number.isInteger(result)
      ? result.toString()
      : parseFloat(result.toFixed(6)).toString();

    // Return result with unit if one was found
    return targetUnit ? `${formattedResult}${targetUnit}` : formattedResult;

  } catch (error) {
    // If evaluation fails, log error and return original expression
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`PostCSS do_math: Failed to evaluate "${expression}" in ${prop}: ${errorMessage}`);
    return `do_math(${expression})`;
  }
}

plugin.postcss = true;

export = plugin;