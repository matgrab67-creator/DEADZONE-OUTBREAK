export class DevConsole {
  constructor({ game, onOpenChange }) {
    this.game = game;
    this.onOpenChange = onOpenChange;
    this.open = false;
    this.root = document.createElement('section');
    this.root.id = 'developer-console';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Local developer console');
    this.root.hidden = true;
    this.root.innerHTML =
      '<header><strong>LOCAL DEVELOPER CONSOLE</strong><button type="button" aria-label="Close console">×</button></header><pre aria-live="polite">Type "help" to list local commands.</pre><form><span>&gt;</span><input aria-label="Developer command" autocomplete="off" spellcheck="false"></form>';
    this.style = document.createElement('style');
    this.style.textContent = `
      #developer-console{position:fixed;z-index:10000;left:50%;top:12vh;transform:translateX(-50%);width:min(720px,94vw);padding:16px;background:#090e0cf2;border:1px solid #87a66e;color:#d9e8cc;box-shadow:0 12px 50px #000b;font:13px/1.5 ui-monospace,Consolas,monospace}
      #developer-console[hidden]{display:none}
      #developer-console header,#developer-console form{display:flex;align-items:center;gap:10px}
      #developer-console header{justify-content:space-between;color:#c6e49f;letter-spacing:1px}
      #developer-console button{border:0;background:transparent;color:inherit;font:inherit;font-size:22px;cursor:pointer}
      #developer-console pre{max-height:34vh;overflow:auto;margin:14px 0;padding:10px;background:#111a14;white-space:pre-wrap;overflow-wrap:anywhere}
      #developer-console form span{color:#c6e49f}
      #developer-console input{flex:1;min-width:0;border:0;border-bottom:1px solid #87a66e;background:transparent;color:inherit;padding:8px;font:inherit;outline:none}
    `;
    document.head.append(this.style);
    document.body.append(this.root);
    this.output = this.root.querySelector('pre');
    this.input = this.root.querySelector('input');
    this.root.querySelector('button').addEventListener('click', () => this.setOpen(false));
    this.root.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      const command = this.input.value.trim();
      if (!command) return;
      this.write(`> ${command}`);
      try {
        this.write(this.execute(command));
      } catch (error) {
        this.write(`ERROR: ${error.message}`);
      }
      this.input.value = '';
    });
    addEventListener(
      'keydown',
      (event) => {
        if (event.ctrlKey && event.code === 'Slash') {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.setOpen(!this.open);
        } else if (this.open && event.code === 'Escape') {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.setOpen(false);
        }
      },
      true,
    );
  }
  execute(source) {
    const [command, argument, extra] = source.trim().split(/\s+/);
    if (extra !== undefined) return 'ERROR: expected one value.';
    if (command === 'help')
      return 'skinpoints <amount> | points <amount> | money infinite | money off';
    if (command === 'skinpoints' || command === 'points') {
      const amount = Number(argument);
      if (!Number.isSafeInteger(amount) || amount <= 0)
        return 'ERROR: amount must be a positive safe integer.';
      if (command === 'skinpoints') {
        if (!Number.isSafeInteger(this.game.skins.balance + amount))
          return 'ERROR: skin point balance would exceed the safe integer limit.';
        this.game.skins.balance += amount;
        this.game.skins.save();
        return `Added ${amount} skin points. Balance: ${this.game.skins.balance}.`;
      }
      if (this.game.mode !== 'solo' || !this.game.sim)
        return 'ERROR: game credits can only be changed during a local solo match.';
      const player = this.game.sim.players.get(this.game.id);
      if (!player || !Number.isSafeInteger(player.points + amount))
        return 'ERROR: game credit balance would exceed the safe integer limit.';
      player.points += amount;
      return `Added ${amount} game credits. Balance: ${player.points}.`;
    }
    if (command === 'money' && argument === 'infinite') {
      if (this.game.mode !== 'solo' || !this.game.sim)
        return 'ERROR: unlimited credits are only available during a local solo match.';
      this.game.devInfiniteMoney = true;
      this.game.applyDevMoney();
      return 'Unlimited game credits enabled for this local solo match.';
    }
    if (command === 'money' && argument === 'off') {
      this.game.devInfiniteMoney = false;
      return 'Unlimited game credits disabled.';
    }
    return 'ERROR: unknown command. Type "help".';
  }
  write(message) {
    this.output.textContent += `\n${message}`;
    this.output.scrollTop = this.output.scrollHeight;
  }
  setOpen(open) {
    if (this.open === open) return;
    this.open = open;
    this.root.hidden = !open;
    this.onOpenChange(open);
    if (open) this.input.focus();
  }
}
