const O6 = Object.freeze({ legalBallsPerOver: 8, pairMaxBalls: 16, batterMaxBalls: 8, coachThrow: true });

function assert(condition, message) {
  if (!condition) throw new Error(`O/6 validation failed: ${message}`);
}

function legalBall(event) {
  return !['WIDE', 'NO_BALL'].includes(event.type) && event.countsAsDelivery !== false;
}

function validateEvent(event, state) {
  if (['RUN', 'WICKET', 'RUN_OUT', 'COACH_THROW'].includes(event.type)) {
    assert(state.batterBalls < O6.batterMaxBalls, 'a batter may not receive a 9th counted ball');
    assert(state.pairBalls < O6.pairMaxBalls, 'a pair may not receive a 17th counted ball');
  }
  if (event.type === 'COACH_THROW') {
    assert(O6.coachThrow, 'coach throw is enabled');
    assert(event.unplayable === true, 'coach throw must originate from an unplayable delivery');
    assert(event.runs >= 0 && event.runs <= 2, 'coach throw runs must be 0, 1 or 2');
  }
  if (['WIDE', 'NO_BALL'].includes(event.type)) {
    assert(state.pendingWorkflow == null, 'extras cannot bypass a pending workflow');
  }
  return {
    legal: legalBall(event),
    batterBalls: state.batterBalls + (legalBall(event) ? 1 : 0),
    pairBalls: state.pairBalls + (legalBall(event) ? 1 : 0),
  };
}

let state = { batterBalls: 0, pairBalls: 0, pendingWorkflow: null };
for (let n = 0; n < 8; n++) state = { ...state, ...validateEvent({ type: 'RUN', runs: n % 2 }, state) };
assert(state.batterBalls === 8, 'eight legal balls must be accepted');
assert(state.pairBalls === 8, 'pair must have eight balls after one batter reaches the limit');

let wideState = validateEvent({ type: 'WIDE', runs: 1 }, state);
assert(wideState.batterBalls === 8, 'wide must not count as a batter ball');
assert(wideState.pairBalls === 8, 'wide must not count toward the O/6 pair legal-ball opportunity');

let coachState = validateEvent({ type: 'COACH_THROW', runs: 1, unplayable: true }, state);
assert(coachState.batterBalls === 9, 'coach throw is treated as a counted O/6 delivery by the validation model');

let rejected = false;
try { validateEvent({ type: 'RUN', runs: 1 }, { batterBalls: 8, pairBalls: 8, pendingWorkflow: null }); } catch { rejected = true; }
assert(rejected, '9th batter ball must be rejected');

rejected = false;
try { validateEvent({ type: 'RUN', runs: 1 }, { batterBalls: 4, pairBalls: 16, pendingWorkflow: null }); } catch { rejected = true; }
assert(rejected, '17th pair ball must be rejected');

rejected = false;
try { validateEvent({ type: 'COACH_THROW', runs: 3, unplayable: true }, { batterBalls: 0, pairBalls: 0, pendingWorkflow: null }); } catch { rejected = true; }
assert(rejected, 'coach throw above two runs must be rejected');

console.log('O/6 validation matrix passed.');
