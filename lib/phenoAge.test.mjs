// Run with `npm test`. Node strips the types from phenoAge.ts itself.
// Expected values come from a separate implementation of the published
// formula (Levine 2018; BioAge R package coefficients), so a slip in the
// TypeScript port shows up here.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { phenoAge, phenoAgeCautions } from './phenoAge.ts'

const typical = { age: 50, albumin: 42, creatinine: 80, glucose: 5.3, crp: 2, lymphocytePct: 30, mcv: 90, rdw: 13, alp: 70, wbc: 6.5 }

test('matches the reference implementation', () => {
  const cases = [
    [typical, 44.7008, 0.028864],
    [{ age: 62, albumin: 36, creatinine: 110, glucose: 7.2, crp: 8, lymphocytePct: 22, mcv: 96, rdw: 15.2, alp: 120, wbc: 8.4 }, 79.5048, 0.491052],
    [{ age: 35, albumin: 47, creatinine: 70, glucose: 4.6, crp: 0.3, lymphocytePct: 38, mcv: 86, rdw: 12.1, alp: 55, wbc: 5.2 }, 18.2198, 0.002686],
  ]
  for (const [inputs, age, mortality] of cases) {
    const result = phenoAge(inputs)
    assert.ok(Math.abs(result.phenoAge - age) < 0.001, `PhenoAge ${result.phenoAge} ≠ ${age}`)
    assert.ok(Math.abs(result.mortality10y - mortality) < 1e-6)
    assert.ok(Math.abs(result.gap - (age - inputs.age)) < 0.001)
  }
})

test('moves the way the model says it should', () => {
  const base = phenoAge(typical).phenoAge
  assert.ok(phenoAge({ ...typical, age: 51 }).phenoAge > base, 'older')
  assert.ok(phenoAge({ ...typical, rdw: 15 }).phenoAge > base, 'higher RDW')
  assert.ok(phenoAge({ ...typical, crp: 6 }).phenoAge > base, 'higher CRP')
  assert.ok(phenoAge({ ...typical, albumin: 46 }).phenoAge < base, 'higher albumin')
  assert.ok(phenoAge({ ...typical, lymphocytePct: 40 }).phenoAge < base, 'higher lymphocytes')
})

test('an undetectable CRP gives a finite age', () => {
  const result = phenoAge({ ...typical, crp: 0 })
  assert.ok(Number.isFinite(result.phenoAge))
  assert.equal(result.phenoAge, phenoAge({ ...typical, crp: 0.1 }).phenoAge)
})

test('flags results that inflate or fall outside the model', () => {
  assert.deepEqual(phenoAgeCautions(typical), [])
  assert.equal(phenoAgeCautions({ ...typical, crp: 25 }).length, 1)
  assert.equal(phenoAgeCautions({ ...typical, wbc: 14 }).length, 1)
  assert.equal(phenoAgeCautions({ ...typical, age: 90 }).length, 1)
})
