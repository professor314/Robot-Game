using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Collections;

namespace CSharpRPG
{
    public partial class Form1 : Form, IMessageFilter
    {

        TileSet ts;

        public Form1()
        {
            InitializeComponent();
            Application.AddMessageFilter(this);
        }

        Map mymap;

        Characters.Player ThePlayer = new Characters.Player();

        private Character CreateCreature(String name, int hp, int posX, int posY)
        {
            switch (name)
            {
                case "Cthulhu":
                    Characters.Cthulhu Cthulhu = new Characters.Cthulhu();
                    Cthulhu.HP = hp;
                    Cthulhu.Position = new Point(posX, posY);
                    mymap.Chars.Add(Cthulhu);
                    MovingEnemies.Add(Cthulhu);
                    return Cthulhu;
                case "Ant":
                    Characters.Ant Ant = new Characters.Ant();
                    Ant.HP = hp;
                    Ant.Position = new Point(posX, posY);
                    mymap.Chars.Add(Ant);
                    MovingEnemies.Add(Ant);
                    return Ant;
                default:
                    throw new ArgumentOutOfRangeException("Creature cannot exist without a position.");
            }
        }

            
        List<Character> MovingEnemies = new List<Character>();
        
        // Timer for enemy movement:
        Timer EnemyTimer = new Timer();

        private Item CreateItem(int TileID)
        {
            switch (TileID) {
                case 600:
                    return new Item("camera", 600);
                case 450:
                    return new SimpleWeapon("Mace", 450, 5);
                case 455:
                    return new SimpleWeapon("staff", 455, 3);
                case 755:
                    return new Item("SpellBook", 755);
                case 800:
                    return new Item("Diamond", 800);
                case 700:
                    return new Item("Scroll", 700);
                case 592:
                    return new Item("Key", 592);
                default:
                    throw new ArgumentOutOfRangeException("Unknown item");
            };
            
        }

        private void Form1_Load(object sender, EventArgs e)
        {

           


            Bitmap bmp = new Bitmap("../../tiles32.png");
            ts = new TileSet(bmp, 32, 32, Color.FromArgb(66, 107, 107));

            mymap = new Map(15, ts);

            
            mymap.CreateRoom(new Point(1, 2), new Point(5, 4));

            mymap.CreateRoom(new Point(8, 1), new Point(11, 13));

            mymap.CreateRoom(new Point(2, 9), new Point(4, 11));

            mymap.CreateHall(new Point(3, 4), new Point(3, 9));

            mymap.CreateHall(new Point(5, 3), new Point(8, 3));

            ThePlayer.Position = new Point(4, 3);
            mymap.Chars.Add(ThePlayer);
            
            // get inventory from db

            Database1DataSetTableAdapters.tblInventoryTableAdapter
                inta = new Database1DataSetTableAdapters.tblInventoryTableAdapter();

            Database1DataSet.tblInventoryDataTable indt =
                inta.GetData();
            foreach (Database1DataSet.tblInventoryRow tir in indt)
            {
                ThePlayer.Inventory.Add(CreateItem(tir.tileID));
                
            }


            // get items from db
            Database1DataSetTableAdapters.tblItemsTableAdapter
                tita = new Database1DataSetTableAdapters.tblItemsTableAdapter();

            Database1DataSet.tblItemsDataTable dt =
                tita.GetData();
            foreach (Database1DataSet.tblItemsRow tir in dt)
            {
                Symbols.Treasure nt = new Symbols.Treasure(CreateItem(tir.tileID));
                nt.PropertyChanged += new PropertyChangedEventHandler(nt_PropertyChanged);
                
                mymap[tir.posX, tir.posY] = nt;
            }

            // add some treasure
           /* mymap[3, 10] = new Symbols.Treasure(new Item("camera", 600));//The indexer thing is very cool
            mymap[3, 7] = new Symbols.Treasure(new Item("camera", 600));
            mymap[10, 5] = new Symbols.Treasure(new SimpleWeapon("Mace", 450, 5));
            mymap[10, 7] = new Symbols.Treasure(new SimpleWeapon("staff", 455, 3));
            mymap[10, 10] = new Symbols.Treasure(new Item("SpellBook", 755));
            mymap[9, 9] = new Symbols.Treasure(new Item("Diamond", 800));
            mymap[10, 8] = new Symbols.Treasure(new Item("Scroll", 700));
            mymap[3,5]= new Symbols.Treasure(new Item("Key",592));
            mymap[10, 4] = new Symbols.Treasure(new SimpleWeapon("Mace", 450, 5));
            */

            // install a locked door
            mymap[5, 3] = new Symbols.LockedDoor(false, new Item("Key", 592));

 
            //Add enemies to map from db:
            Database1DataSetTableAdapters.tblCreaturesTableAdapter
                cta = new Database1DataSetTableAdapters.tblCreaturesTableAdapter();

            Database1DataSet.tblCreaturesDataTable cdt =
                cta.GetData();
            foreach (Database1DataSet.tblCreaturesRow tir in cdt)
            {
                CreateCreature(tir.name, tir.health, tir.posX, tir.posY);
                

            }

            // Add enemy to map:
            //TheEnemy.Position = new Point(10, 6);
            //mymap.Chars.Add(TheEnemy);
            //MovingEnemies.Add(TheEnemy);

            //AntEnemy.Position = new Point(3, 6);
            //mymap.Chars.Add(AntEnemy);
            //MovingEnemies.Add(AntEnemy);
         
            // Establish enemy movement timer:
            EnemyTimer.Interval = 1000;
            EnemyTimer.Tick += new EventHandler(MoveEnemy);
            EnemyTimer.Enabled = true;
            EnemyTimer.Start();

            fireBox1.BoxBorder = false;

            fireBox1.Background = mymap.GetColors();

            fireBox1.Images = mymap.GetImages();

            gameLog = new frmLog(ThePlayer);

            this.KeyPreview = true;
            //btnStats.Focus();
        }

        void nt_PropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            // Treasure picked up
            // remove it from the database
            // (from items table)

            // to do so: must know position! (x,y)
            Symbols.Treasure nt = (Symbols.Treasure)sender;
            Point? pos = mymap.FindSymbol(nt);
            if (pos.HasValue)
            {
                Database1DataSetTableAdapters.tblItemsTableAdapter
                    ita = new Database1DataSetTableAdapters.tblItemsTableAdapter();
                ita.DeleteByPos(pos.Value.X, pos.Value.Y);

                
            }
            else throw new Exception("This can't happen??");

            
        }
        
        /// <summary>
        /// Moves character to requested destination on map if it's a valid position.
        /// </summary>
        /// <param name="charType">The type of character that is moving</param>
        /// <param name="dest">The requested destination for the character.</param>
        private void MoveCharacter(Character character, Point dest)
        {
            // If requested destination is not a valid spot, stay put.
            Character target = mymap.localCharacter(dest);
            if (mymap[dest.X, dest.Y] == null)
                character.Position = character.Position;

            //do attack if other character there.  Enemies can attack eachother too.
            //I could restrict so only player and enemy could attack eachother, but
            //I think Cthulhu would attack an ant and vice versa.  See commented code
            //for the other way.

            //else if(target != null && (character==ThePlayer || target==ThePlayer))
                //if its the player it can attack anything.  Otherwise, it can only attack the player.
            else if (target != null)
            { 
                character.attack(target);
                if (target != ThePlayer)
                {
                    Database1DataSetTableAdapters.tblCreaturesTableAdapter
                    cta = new Database1DataSetTableAdapters.tblCreaturesTableAdapter();
                    cta.UpdateHealth(target.HP, target.charName.ToString());

                }

                if (target.HP == 0)
                {
                    if (target == ThePlayer)
                    {
                        EnemyTimer.Enabled = false;
                        MessageBox.Show("Lose! You were fangoriously devoured by " + character.charName + "!!");
                        this.Close();
                    }
                    else
                    {
                        //I shall strike you from most recorded history!

                        Database1DataSetTableAdapters.tblCreaturesTableAdapter
                        cta = new Database1DataSetTableAdapters.tblCreaturesTableAdapter();
                        cta.DeleteCreature(target.charName);
                        MovingEnemies.Remove(target);
                        
                        mymap.Chars.Remove(target);
                    }
                }
            }

            // Else enter method of requested destination returns true,
            // then move character to that position.
            else if (mymap[dest.X, dest.Y].Enter(character) == true)
            {
                character.Position = dest;
                Database1DataSetTableAdapters.tblCreaturesTableAdapter
                    cta = new Database1DataSetTableAdapters.tblCreaturesTableAdapter();
                cta.UpdatePosition(character.Position.X, character.Position.Y, character.charName.ToString());
            }
            
            // refresh firebox:
            fireBox1.Background = mymap.GetColors();
            fireBox1.Images = mymap.GetImages();
        }
        
        private void Form1_KeyDown(object sender, KeyEventArgs e)
        {
            Point dest = ThePlayer.Position;

            switch (e.KeyCode)
            {
                case Keys.Up:
                    dest = new Point(ThePlayer.Position.X, ThePlayer.Position.Y - 1);
                    break;

                case Keys.Down:
                    dest = new Point(ThePlayer.Position.X, ThePlayer.Position.Y + 1);
                    break;

                case Keys.Left:
                    dest = new Point(ThePlayer.Position.X - 1, ThePlayer.Position.Y);
                    break;

                case Keys.Right:
                    dest = new Point(ThePlayer.Position.X + 1, ThePlayer.Position.Y);
                    break;
            }
            // Call MoveCharacter to move the player if destination is valid.
            MoveCharacter(ThePlayer, dest);
            
        }

        private Random rand = new Random();
        /// <summary>
        /// RandDirection picks a random number from 1 to 4
        /// representing the 4 different directions you are able
        /// to move.
        /// </summary>
        /// <returns>int up = 1, down = 2, left = 3, right = 4</returns>
        public int RandDirection()
        {
            return rand.Next(1, 5);
        }

        /// <summary>
        /// Timer tick event handler. This moves the enemy character to
        /// a random valid location on the map each timer interval.
        /// </summary>
        /// <param name="s">Sender of event</param>
        /// <param name="e">Holds data for this event</param>
        private void MoveEnemy(object s, EventArgs e)
        {
            foreach (Character enemy in MovingEnemies)
            {
                Point dest = enemy.Position;
                // Get random direction from enemy class:
                int direction = RandDirection();


                switch (direction)
                {
                    case 1: // up
                        dest = new Point(enemy.Position.X, enemy.Position.Y - 1);
                        break;

                    case 2: // down
                        dest = new Point(enemy.Position.X, enemy.Position.Y + 1);
                        break;

                    case 3: // left
                        dest = new Point(enemy.Position.X - 1, enemy.Position.Y);
                        break;

                    case 4: // right
                        dest = new Point(enemy.Position.X + 1, enemy.Position.Y);
                        break;
                }


                // Check if player adjacent.  If so,
                // attack player specifically
                if (Math.Abs(ThePlayer.Position.X - enemy.Position.X) +
                    Math.Abs(ThePlayer.Position.Y - enemy.Position.Y)
                    == 1)
                    dest = ThePlayer.Position;

                // Call MoveCharacter to move the enemy if destination is valid.
                MoveCharacter(enemy, dest);
            }
        }

        frmStats fs;
        private void btnStats_Click(object sender, EventArgs e)
        {

            // if window closed, recreate
            if (fs == null || fs.Visible != true)
                fs = new frmStats(ts, ThePlayer);
            //fs.ShowDialog(); // MODAL suspend until done
            
            fs.Show(); // NON-MODAL  / MODELESS
            // allows user to interact with this form
            fs.Focus();

        }

        #region IMessageFilter Members

        private const int WM_KEYDOWN = 0x100;

        public bool PreFilterMessage(ref Message m)
        {
            switch (m.Msg)
            {
                case WM_KEYDOWN:
                    Form1_KeyDown(this, new KeyEventArgs((Keys)(int)m.WParam));
                    break;
                
                default:
                    return false;
            }
            return true;

        }

        #endregion


        private frmLog gameLog;
        private void btnLog_Click(object sender, EventArgs e)
        {
            gameLog.Show();
            gameLog.Focus();
        }
    }

}
