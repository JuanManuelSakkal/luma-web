import { describe, expect, it } from 'vitest'
import { partirDescripcion } from './descripcion'

describe('partirDescripcion', () => {
  it('separa párrafos por línea en blanco y junta las viñetas en una lista', () => {
    const texto = [
      'Top de terminación brillante',
      'que no amarillenta.',
      '',
      '- Contenido: 15 ml',
      '• Secado: 60 s en lámpara LED',
      '',
      'Agitar antes de usar.',
    ].join('\r\n')
    expect(partirDescripcion(texto)).toEqual([
      { tipo: 'parrafo', texto: 'Top de terminación brillante que no amarillenta.' },
      { tipo: 'lista', items: ['Contenido: 15 ml', 'Secado: 60 s en lámpara LED'] },
      { tipo: 'parrafo', texto: 'Agitar antes de usar.' },
    ])
  })

  it('una lista pegada a un párrafo corta el párrafo', () => {
    expect(partirDescripcion('Incluye:\n- Lima\n- Pusher')).toEqual([
      { tipo: 'parrafo', texto: 'Incluye:' },
      { tipo: 'lista', items: ['Lima', 'Pusher'] },
    ])
  })

  it('sin texto no hay bloques', () => {
    expect(partirDescripcion(null)).toEqual([])
    expect(partirDescripcion('  \n \n')).toEqual([])
  })

  it('un guion en medio de una frase no es viñeta', () => {
    expect(partirDescripcion('Aros de acero')).toEqual([{ tipo: 'parrafo', texto: 'Aros de acero' }])
  })
})
