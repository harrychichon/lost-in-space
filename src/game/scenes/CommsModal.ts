import { Scene } from 'phaser'
import { GameState } from '../systems/GameState'

export class CommsModal extends Scene {
    private leftKey!: Phaser.Input.Keyboard.Key
    private rightKey!: Phaser.Input.Keyboard.Key
    private keyA!: Phaser.Input.Keyboard.Key
    private keyD!: Phaser.Input.Keyboard.Key
    private interactKey!: Phaser.Input.Keyboard.Key
    private leaveKey!: Phaser.Input.Keyboard.Key
    private statusText!: Phaser.GameObjects.Text
    private infoText!: Phaser.GameObjects.Text
    private needle!: Phaser.GameObjects.Rectangle
    private channelIcons: Phaser.GameObjects.Text[] = []
    private targetBand!: Phaser.GameObjects.Rectangle

    private finished = false
    private tuningDone = false
    private channelCount = 3
    private tunedCount = 0
    private dialX = 0
    private dialMin = 0
    private dialMax = 0
    private targetCenter = 0
    private targetHalfWidth = 0
    private readonly dialSpeed = 240

    constructor() {
        super('CommsModal')
    }

    create() {
        this.finished = false
        this.tuningDone = false
        this.tunedCount = 0
        this.channelIcons = []

        const { width, height } = this.scale
        const cx = width * 0.5
        const cy = height * 0.5

        const mw = 560
        const mh = 340
        const mt = cy - mh / 2

        const state = GameState.get(this)
        const isRescue = GameState.isRescueEventReady(this)

        const modalColorFx = this.cameras.main.postFX.addColorMatrix()
        modalColorFx.saturate(0.56)

        this.add.rectangle(cx, cy, width, height, 0x000000, 0.72)

        this.add.rectangle(cx, cy, mw, mh, 0x12121a, 1)
        const border = this.add.graphics()
        border.lineStyle(1, 0x353545, 0.8)
        border.strokeRect(cx - mw / 2, mt, mw, mh)

        this.add
            .text(cx, mt + 32, 'Communications', {
                fontFamily: 'Georgia, serif',
                fontSize: '22px',
                color: '#777799',
            })
            .setOrigin(0.5)

        const flavor =
            state.companions === 0
                ? 'Calibrate the receiver and isolate a clear signal through static.'
                : 'Run a clean sweep and lock each channel.'
        this.add
            .text(cx, mt + 68, flavor, {
                fontFamily: 'Georgia, serif',
                fontSize: '13px',
                color: '#60607a',
                align: 'center',
                wordWrap: { width: 460 },
            })
            .setOrigin(0.5)

        const panel = this.add.rectangle(cx, mt + 148, 420, 96, 0x0d0d14, 1)
        const panelBorder = this.add.graphics()
        panelBorder.lineStyle(1, 0x2d2d3d, 1)
        panelBorder.strokeRect(panel.x - panel.width / 2, panel.y - panel.height / 2, panel.width, panel.height)

        const scanText = this.add
            .text(cx, mt + 122, 'SCANNING FREQUENCIES', {
                fontFamily: '"Share Tech Mono", "Courier New", monospace',
                fontSize: '15px',
                color: '#8c8ca8',
            })
            .setOrigin(0.5)

        this.tweens.add({
            targets: scanText,
            alpha: 0.45,
            duration: 260,
            yoyo: true,
            repeat: -1,
            ease: 'Stepped',
            easeParams: [1],
        })

        const barY = mt + 174
        const barLeft = cx - 160
        const barW = 320
        const barH = 14

        this.add.rectangle(cx, barY, barW, barH, 0x1a1a26, 1)
        const barFrame = this.add.graphics()
        barFrame.lineStyle(1, 0x3c3c55, 0.9)
        barFrame.strokeRect(barLeft, barY - barH / 2, barW, barH)

        this.targetCenter = barLeft + Phaser.Math.Between(75, 245)
        this.targetHalfWidth = 18
        this.targetBand = this.add.rectangle(this.targetCenter, barY, this.targetHalfWidth * 2, barH, 0x2f4f66, 0.8)

        this.dialMin = barLeft
        this.dialMax = barLeft + barW
        this.dialX = this.dialMin
        this.needle = this.add.rectangle(this.dialX, barY, 4, barH + 7, 0xaabbee, 1)

        this.add
            .text(cx, mt + 212, 'Use A/D or Arrow keys for movement: tune frequency   |   E: lock channel', {
                fontFamily: 'Georgia, serif',
                fontSize: '12px',
                color: '#d9d4e1',
            })
            .setOrigin(0.5)

        const iconY = mt + 242
        this.channelIcons = []
        for (let i = 0; i < this.channelCount; i++) {
            const ix = cx - 36 + i * 36
            const icon = this.add.text(ix, iconY, '◌', {
                fontFamily: 'Georgia, serif',
                fontSize: '18px',
                color: '#5e5e74',
            }).setOrigin(0.5)
            this.channelIcons.push(icon)
        }

        this.infoText = this.add
            .text(cx, mt + 262, 'Lock all channels to complete comms check.', {
                fontFamily: 'Georgia, serif',
                fontSize: '12px',
                color: '#6f6f88',
                align: 'center',
            })
            .setOrigin(0.5)

        this.statusText = this.add
            .text(cx, mt + 292, '', {
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                color: '#8888aa',
                align: 'center',
                wordWrap: { width: 500 },
            })
            .setOrigin(0.5)

        this.add
            .text(cx + mw / 2 - 16, mt + mh - 18, '[L] Leave', {
                fontFamily: 'Georgia, serif',
                fontSize: '11px',
                color: '#4d4d63',
            })
            .setOrigin(1, 0.5)

        this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
        this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
        this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
        this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)
        this.leaveKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L)

        if (isRescue) {
            scanText.setText('DISTRESS SIGNAL DETECTED')
            scanText.setColor('#bb9a9a')
            this.targetBand.setFillStyle(0x664444, 0.8)
            this.infoText.setText('Signal spike detected. Tune and lock channels quickly.')
        }
    }

    update(_time: number, delta: number) {
        if (this.finished) return

        if (!this.tuningDone) {
            this.updateDial(delta)
        }

        if (Phaser.Input.Keyboard.JustDown(this.interactKey) && !this.tuningDone) {
            this.tryLockChannel()
        }

        if (Phaser.Input.Keyboard.JustDown(this.leaveKey)) {
            this.closeModal(false)
        }
    }

    private updateDial(delta: number) {
        const dt = delta / 1000
        const left = this.leftKey.isDown || this.keyA.isDown
        const right = this.rightKey.isDown || this.keyD.isDown

        if (left) this.dialX -= this.dialSpeed * dt
        if (right) this.dialX += this.dialSpeed * dt

        this.dialX = Phaser.Math.Clamp(this.dialX, this.dialMin, this.dialMax)
        this.needle.x = this.dialX
    }

    private tryLockChannel() {
        const inBand = Math.abs(this.dialX - this.targetCenter) <= this.targetHalfWidth
        if (!inBand) {
            this.tweens.add({
                targets: this.needle,
                alpha: 0.25,
                duration: 90,
                yoyo: true,
            })
            this.statusText.setText('Noise burst. Fine-tune closer to signal peak.').setColor('#8888aa')
            return
        }

        this.channelIcons[this.tunedCount].setText('●').setColor('#9ec0ff')
        this.tunedCount++
        this.sound.play('beep_sequence', { volume: 0.45 })

        if (this.tunedCount >= this.channelCount) {
            this.tuningDone = true
            this.onListenComplete()
            return
        }

        this.statusText
            .setText(`Channel ${this.tunedCount}/${this.channelCount} locked.`)
            .setColor('#8fa5d6')
        this.randomizeTargetBand()
    }

    private randomizeTargetBand() {
        this.targetCenter = Phaser.Math.Between(this.dialMin + 45, this.dialMax - 45)
        this.targetBand.x = this.targetCenter
    }

    private onListenComplete() {
        if (this.finished) return
        this.finished = true

        const state = GameState.get(this)
        const isRescue = GameState.isRescueEventReady(this)

        GameState.completeChore(this, 'comms')
        this.sound.play('creepy_static', { volume: 0.5 })

        if (isRescue) {
            this.statusText
                .setText('...not static. A voice breaks through:\n"Is anyone there? Please... I need help."')
                .setColor('#bbaaaa')
            this.time.delayedCall(1800, () => {
                this.scene.stop('CommsModal')
                this.scene.stop('Ship')
                this.scene.start('RescueEvent')
            })
            return
        }

        const msg =
            state.companions === 0
                ? 'Static. Nothing but static. You listen anyway.'
                : 'You scan the frequencies. Nothing new.'
        this.statusText.setText(msg)

        this.time.delayedCall(1200, () => this.closeModal(true))
    }

    private closeModal(choreCompleted: boolean) {
        if (choreCompleted) {
            this.scene.stop('CommsModal')
            this.scene.get('Ship').scene.restart({ fromRoom: 'Comms' })
        } else {
            this.scene.resume('Ship')
            this.scene.stop('CommsModal')
        }
    }
}
