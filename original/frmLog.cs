using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace CSharpRPG
{
    public partial class frmLog : Form
    {
        private Character _c;
        public frmLog(Character c)
        {
            InitializeComponent();

            _c = c;
            _c.PropertyChanged += new PropertyChangedEventHandler(_c_PropertyChanged);
            Character.attackHappened += new Character.attackEventHandler(_c_attackHappened);
        }

        //because I can
        void _c_PropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            Character.characterPropertyChangedEventArgs changes = (Character.characterPropertyChangedEventArgs)e;
            string property = changes.PropertyName;
            string actor = changes.actor;
            string newItem;

            if (property == "Inventory, added") newItem = "Player picked up a " + actor;
            else if (property == "Inventory, dropped") newItem = "Player dropped an item";
            else if (property == "HP") newItem = "Player health points changed by " + actor.ToString() + ".";
            else if (property == "activeItem") newItem = actor + " equipped on the player.";
            else newItem = "Something happened.";

            listLog.Items.Add(newItem);
        }

        void _c_attackHappened(string attacker, string target, int damageDealt)
        {
            listLog.Items.Add(attacker + " attacked " + target + " for " + damageDealt + " points of damage.");
        }




        //clear the contents of the log
        private void btnClear_Click(object sender, EventArgs e)
        {
            listLog.Items.Clear();
        }

        private void btnHide_Click(object sender, EventArgs e)
        {
            this.Hide();
        }
    }
}
